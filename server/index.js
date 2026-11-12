require('dotenv').config({ path: '../../.env' });

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173',
    'https://art-museum-coral.vercel.app/',
    /^https:\/\/art-museum.*\.vercel\.app$/], // for testing branches with deployment
  credentials: true
}));

app.use(express.json());
app.use(require('cookie-parser')());

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.museum_token;

  if (!token) {
    return res.status(401).json({ error: 'Please log in.' });
  }

  try {
    req.user = jwt.verify(token, process.env.AUTH_TOKEN_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  next();
}

function requireAdminOrClerk(req, res, next) {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'CLERK')) {
    return res.status(403).json({ error: 'Admin or Clerk access required.' });
  }

  next();
}

function requireAdminOrCurator(req, res, next) {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'CURATOR')) {
    return res.status(403).json({ error: 'Admin or Curator access required.' });
  }

  next();
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

function handleDatabaseError(res, error, fallbackMessage) {
  console.error('Database error:', error.message);

  if (error.code === 'ER_SIGNAL_EXCEPTION' || error.errno === 1644) {
    return res.status(400).json({
      error: error.sqlMessage || error.message
    });
  }

  return res.status(500).json({
    error: fallbackMessage
  });
}

// Home route
app.get('/', (req, res) => {
  res.send('Museum backend is running!');
});

// Register

app.post('/api/auth/register', async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (!process.env.AUTH_TOKEN_SECRET) {
      return res.status(500).json({
        error: 'Authentication is not configured.'
      });
    }

    const firstName = String(req.body.firstName || '').trim();
    const middleName = String(req.body.middleName || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();
    const password = req.body.password;

    if (!firstName || !lastName) {
      return res.status(400).json({
        error: 'First name and last name are required.'
      });
    }

    if (
      firstName.length > 30 ||
      middleName.length > 30 ||
      lastName.length > 30 ||
      email.length > 50 ||
      phone.length > 15
    ) {
      return res.status(400).json({
        error: 'One or more fields exceed the allowed length.'
      });
    }

    if (!email || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'Enter a valid email and a password of at least 8 characters.'
      });
    }

    const [existing] = await connection.execute(
      'SELECT UserID FROM USER_ACCOUNT WHERE Email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'An account with this email already exists.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await connection.beginTransaction();

    const [visitorIDs] = await connection.query(
      'SELECT COALESCE(MAX(VisitorID), 0) + 1 AS nextID FROM VISITOR FOR UPDATE'
    );

    const visitorID = visitorIDs[0].nextID;

    await connection.execute(
      `INSERT INTO VISITOR
      (VisitorID, FirstName, MiddleName, LastName, Email, Phone)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        visitorID,
        firstName,
        middleName || null,
        lastName,
        email,
        phone || null
      ]
    );

    await connection.execute(
      `INSERT INTO USER_ACCOUNT
       (VisitorID, Email, PasswordHash, AccountRole)
       VALUES (?, ?, ?, 'VISITOR')`,
      [visitorID, email, passwordHash]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Account created successfully.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Registration error:', error.message);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'An account with this email already exists.'
      });
    }

    res.status(500).json({
      error: 'Registration failed. Please try again.'
    });
  } finally {
    connection.release();
  }
});


// Log in
app.post('/api/auth/login', async (req, res) => {
  try {
    if (!process.env.AUTH_TOKEN_SECRET) {
      return res.status(500).json({ error: 'Authentication is not configured.' });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [rows] = await db.execute(
      `SELECT UserID, VisitorID, Email, PasswordHash, AccountRole
       FROM USER_ACCOUNT
       WHERE Email = ?
       LIMIT 1`,
      [email]
    );

    if (
      rows.length === 0 ||
      !(await bcrypt.compare(password, rows[0].PasswordHash))
    ) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const account = rows[0];

    const token = jwt.sign(
      {
        userId: account.UserID,
        VisitorID: account.VisitorID,
        email: account.Email,
        role: account.AccountRole
      },
      process.env.AUTH_TOKEN_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('museum_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000
    });

    res.json({
      user: {
        id: account.UserID,
        email: account.Email,
        role: account.AccountRole
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed.' });
  }
});


app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        error: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters.'
      });
    }

    const [accounts] = await db.execute(
      `SELECT PasswordHash
       FROM USER_ACCOUNT
       WHERE UserID = ?
       LIMIT 1`,
      [req.user.userId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({
        error: 'Account not found.'
      });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      accounts[0].PasswordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Current password is incorrect.'
      });
    }

    if (await bcrypt.compare(newPassword, accounts[0].PasswordHash)) {
      return res.status(400).json({
        error: 'Your new password must be different from your current password.'
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await db.execute(
      `UPDATE USER_ACCOUNT
       SET PasswordHash = ?
       WHERE UserID = ?`,
      [newPasswordHash, req.user.userId]
    );

    res.clearCookie('museum_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/'
    });

    res.json({
      message: 'Password changed successfully. Please log in again.'
    });
  } catch (error) {
    console.error('Change password error:', error.message);

    res.status(500).json({
      error: 'Could not change password. Please try again.'
    });
  }
});


// Check admin session
app.get('/api/auth/admin/me', requireAuth, requireAdmin, (req, res) => {
  res.json({
    user: {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Check clerk session
app.get('/api/auth/clerk/me', requireAuth, (req, res) => {
  if (req.user.role !== 'CLERK') {
    return res.status(403).json({
      error: 'Clerk access required.'
    });
  }

  res.json({
    user: {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Check curator session
app.get('/api/auth/curator/me', requireAuth, (req, res) => {
  if (req.user.role !== 'CURATOR') {
    return res.status(403).json({
      error: 'Curator access required.'
    });
  }

  res.json({
    user: {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Check the current session
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'VISITOR' || !req.user.VisitorID) {
      return res.status(403).json({
        error: 'A visitor account is required.'
      });
    }

    const [rows] = await db.query(
      `SELECT FirstName, MiddleName, LastName, Email, Phone
       FROM VISITOR
       WHERE VisitorID = ?`,
      [req.user.VisitorID]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Visitor information not found.'
      });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    console.error('Error loading visitor information:', error.message);
    res.status(500).json({
      error: 'Could not load visitor information.'
    });
  }
});

app.put('/api/auth/me', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'VISITOR' || !req.user.VisitorID) {
      return res.status(403).json({
        error: 'A visitor account is required.'
      });
    }

    const FirstName = String(req.body.FirstName || '').trim();
    const MiddleName = String(req.body.MiddleName || '').trim();
    const LastName = String(req.body.LastName || '').trim();
    const Email = String(req.body.Email || '').trim().toLowerCase();
    const Phone = String(req.body.Phone || '').trim();

    if (!FirstName || !LastName || !Email) {
      return res.status(400).json({
        error: 'First name, last name, and email are required.'
      });
    }

    if (
      FirstName.length > 30 ||
      MiddleName.length > 30 ||
      LastName.length > 30 ||
      Email.length > 50 ||
      Phone.length > 15
    ) {
      return res.status(400).json({
        error: 'One or more fields exceed the allowed length.'
      });
    }

    const [accounts] = await db.query(
      `SELECT UserID
       FROM USER_ACCOUNT
       WHERE Email = ? AND UserID <> ?`,
      [Email, req.user.userId]
    );

    if (accounts.length > 0) {
      return res.status(409).json({
        error: 'That email is already used by another account.'
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE VISITOR
         SET FirstName = ?, MiddleName = ?, LastName = ?,
             Email = ?, Phone = ?
         WHERE VisitorID = ?`,
        [
          FirstName,
          MiddleName || null,
          LastName,
          Email,
          Phone || null,
          req.user.VisitorID
        ]
      );

      await connection.query(
        `UPDATE USER_ACCOUNT
         SET Email = ?
         WHERE UserID = ?`,
        [Email, req.user.userId]
      );

      await connection.commit();

      res.json({
        message: 'Visitor information saved successfully.'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'That email is already in use.'
      });
    }

    console.error('Error updating visitor information:', error.message);
    res.status(500).json({
      error: 'Could not save visitor information.'
    });
  }
});

// Log out
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('museum_token', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/'
  });

  res.json({ message: 'Logged out successfully.' });
});

// Test route
app.get('/test-route', (req, res) => {
  res.send('This is the updated server');
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Museum API is working!' });
});

// Database health check
app.get('/api/db-health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 AS connected');

    res.json({
      message: 'Connected to the museum database!',
      database: rows[0].connected === 1
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    res.status(500).json({
      message: 'Database connection failed.'
    });
  }
});

// Check the database and ARTWORK columns
app.get('/api/check-artwork-columns', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [database] = await db.query('SELECT DATABASE() AS name');
    const [columns] = await db.query('DESCRIBE ARTWORK');

    res.json({
      database: database[0].name,
      columns: columns.map(column => column.Field)
    });
  } catch (error) {
    console.error('Error checking artwork columns:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all artists
app.get('/api/artists', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ARTIST');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching artists:', error.message);
    res.status(500).json({ error: 'Failed to fetch artists' });
  }
});

// Add a new artist
app.post('/api/artists', requireAuth, requireAdminOrCurator, async (req, res) => {
  const {
    ArtistID,
    FirstName,
    MiddleName,
    LastName,
    Nationality,
    BirthDate,
    DeathDate
  } = req.body;

  if (!ArtistID || !FirstName?.trim() || !LastName?.trim()) {
    return res.status(400).json({
      error: 'Artist ID, first name, and last name are required'
    });
  }

  try {
    await db.query(
      `INSERT INTO ARTIST
       (ArtistID, FirstName, MiddleName, LastName, Nationality, BirthDate, DeathDate)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ArtistID,
        FirstName.trim(),
        MiddleName?.trim() || null,
        LastName.trim(),
        Nationality?.trim() || null,
        BirthDate || null,
        DeathDate || null
      ]
    );

    res.status(201).json({ message: 'Artist added successfully' });
  } catch (error) {
    console.error('Error adding artist:', error.message);
    res.status(500).json({ error: 'Failed to add artist' });
  }
});

// Update an existing artist
app.put('/api/artists/:id', requireAuth, requireAdminOrCurator, async (req, res) => {
  const {
    FirstName,
    MiddleName,
    LastName,
    Nationality,
    BirthDate,
    DeathDate
  } = req.body;

  if (!FirstName?.trim() || !LastName?.trim()) {
    return res.status(400).json({
      error: 'First name and last name are required'
    });
  }

  try {
    const [result] = await db.query(
      `UPDATE ARTIST
       SET FirstName = ?, MiddleName = ?, LastName = ?,
           Nationality = ?, BirthDate = ?, DeathDate = ?
       WHERE ArtistID = ?`,
      [
        FirstName.trim(),
        MiddleName?.trim() || null,
        LastName.trim(),
        Nationality?.trim() || null,
        BirthDate || null,
        DeathDate || null,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    res.json({ message: 'Artist updated successfully' });
  } catch (error) {
    console.error('Error updating artist:', error.message);
    res.status(500).json({ error: 'Failed to update artist' });
  }
});

// Delete an artist
app.delete('/api/artists/:id', requireAuth, requireAdminOrCurator, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM ARTIST WHERE ArtistID = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    res.json({ message: 'Artist deleted successfully' });
  } catch (error) {
    console.error('Error deleting artist:', error.message);
    res.status(500).json({ error: 'Failed to delete artist' });
  }
});


// Get all artworks, returning only the year to the frontend
app.get('/api/artworks', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        A.ArtworkID,
        GROUP_CONCAT(DISTINCT AA.ArtistID ORDER BY AA.ArtistID SEPARATOR ',') AS ArtistIDs,
        A.Name,
        A.Description,
        A.Type,
        A.Origin,
        YEAR(A.CreationDate) AS CreationYear,
        GROUP_CONCAT(
          CONCAT(AR.FirstName, ' ', AR.LastName)
          SEPARATOR ', '
        ) AS ArtistNames
      FROM ARTWORK A
      LEFT JOIN ARTIST_ARTWORK AA ON A.ArtworkID = AA.ArtworkID
      LEFT JOIN ARTIST AR ON AA.ArtistID = AR.ArtistID
      GROUP BY
        A.ArtworkID,
        A.Name,
        A.Description,
        A.Type,
        A.Origin,
        A.CreationDate
      ORDER BY A.Name
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching artworks:', error.message);
    res.status(500).json({ error: 'Failed to fetch artworks' });
  }
});

// Get all exhibitions
app.get('/api/exhibitions', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM EXHIBITION');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching exhibitions:', error.message);
    res.status(500).json({ error: 'Failed to fetch exhibitions' });
  }
});


 // Get artworks in a specific exhibition
app.get('/api/exhibitions/:id/artworks', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
          A.ArtworkID,
          A.Name,
          A.Description,
          A.Type,
          A.Origin,
          A.CreationDate,
          GROUP_CONCAT(
            CONCAT(AR.FirstName, ' ', AR.LastName)
            SEPARATOR ', '
          ) AS ArtistNames
      FROM EXHIBITION_ARTWORK EA
      JOIN ARTWORK A ON EA.ArtworkID = A.ArtworkID
      LEFT JOIN ARTIST_ARTWORK AA ON A.ArtworkID = AA.ArtworkID
      LEFT JOIN ARTIST AR ON AA.ArtistID = AR.ArtistID
      WHERE EA.ExhibitionID = ?
      GROUP BY
          A.ArtworkID,
          A.Name,
          A.Description,
          A.Type,
          A.Origin,
          A.CreationDate`,
      [req.params.id]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching exhibition artworks:', error.message);
    res.status(500).json({ error: 'Failed to fetch exhibition artworks' });
  }
});

 // Add an artwork to an exhibition
app.post(
  '/api/exhibitions/:id/artworks',
  requireAuth,
  requireAdminOrCurator,
  async (req, res) => {
    const exhibitionID = Number(req.params.id);
    const artworkID = Number(req.body.ArtworkID);

    if (
      !Number.isInteger(exhibitionID) || exhibitionID <= 0 ||
      !Number.isInteger(artworkID) || artworkID <= 0
    ) {
      return res.status(400).json({
        error: 'Valid exhibition and artwork IDs are required.'
      });
    }

    try {
      const [exhibitions] = await db.query(
        'SELECT ExhibitionID FROM EXHIBITION WHERE ExhibitionID = ?',
        [exhibitionID]
      );

      if (exhibitions.length === 0) {
        return res.status(404).json({ error: 'Exhibition not found.' });
      }

      const [artworks] = await db.query(
        'SELECT ArtworkID FROM ARTWORK WHERE ArtworkID = ?',
        [artworkID]
      );

      if (artworks.length === 0) {
        return res.status(404).json({ error: 'Artwork not found.' });
      }

      await db.query(
        `INSERT INTO EXHIBITION_ARTWORK (ExhibitionID, ArtworkID)
         VALUES (?, ?)`,
        [exhibitionID, artworkID]
      );

      res.status(201).json({
        message: 'Artwork added to exhibition successfully.'
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'This artwork is already in the exhibition.'
        });
      }

      console.error('Error adding exhibition artwork:', error.message);
      res.status(500).json({
        error: 'Failed to add artwork to exhibition.'
      });
    }
  }
);

// Remove an artwork from an exhibition
app.delete(
  '/api/exhibitions/:id/artworks/:artworkId',
  requireAuth,
  requireAdminOrCurator,
  async (req, res) => {
    const exhibitionID = Number(req.params.id);
    const artworkID = Number(req.params.artworkId);

    if (
      !Number.isInteger(exhibitionID) || exhibitionID <= 0 ||
      !Number.isInteger(artworkID) || artworkID <= 0
    ) {
      return res.status(400).json({
        error: 'Valid exhibition and artwork IDs are required.'
      });
    }

    try {
      const [result] = await db.query(
        `DELETE FROM EXHIBITION_ARTWORK
         WHERE ExhibitionID = ? AND ArtworkID = ?`,
        [exhibitionID, artworkID]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Artwork was not assigned to this exhibition.'
        });
      }

      res.json({
        message: 'Artwork removed from exhibition successfully.'
      });
    } catch (error) {
      console.error('Error removing exhibition artwork:', error.message);
      res.status(500).json({
        error: 'Failed to remove artwork from exhibition.'
      });
    }
  }
);

// Add a new exhibition
app.post('/api/exhibitions', requireAuth, requireAdminOrCurator, async (req, res) => {
  const {
    ExhibitionID,
    Name,
    Description,
    StartDate,
    EndDate,
    ExhibitionType,
    GalleryID,
    ManagerID
  } = req.body;

  console.log('Exhibition request:', req.body);
  console.log('GalleryID received:', req.body.GalleryID);
  console.log('ManagerID received:', req.body.ManagerID);

  if (!ExhibitionID || !Name?.trim() || !ExhibitionType?.trim()) {
    return res.status(400).json({
      error: 'Exhibition ID, name, and exhibition type are required'
    });
  }

  try {
    await db.query(
      `INSERT INTO EXHIBITION
       (ExhibitionID, Name, Description, StartDate, EndDate,
        ExhibitionType, GalleryID, ManagerID)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ExhibitionID,
        Name.trim(),
        Description?.trim() || null,
        StartDate || null,
        EndDate || null,
        ExhibitionType.trim(),
        GalleryID || null,
        ManagerID || null
      ]
    );

    res.status(201).json({ message: 'Exhibition added successfully' });
    } catch (error) {
      return handleDatabaseError(
        res,
        error,
        'Failed to add exhibition'
      );
    }
});

// Update an exhibition
app.put('/api/exhibitions/:id', requireAuth, requireAdminOrCurator, async (req, res) => {
  const {
    Name,
    Description,
    StartDate,
    EndDate,
    ExhibitionType,
    GalleryID,
    ManagerID
  } = req.body;

  if (!Name?.trim() || !ExhibitionType?.trim()) {
    return res.status(400).json({
      error: 'Name and exhibition type are required'
    });
  }

  try {
    const [result] = await db.query(
      `UPDATE EXHIBITION
       SET Name = ?, Description = ?, StartDate = ?, EndDate = ?,
           ExhibitionType = ?, GalleryID = ?, ManagerID = ?
       WHERE ExhibitionID = ?`,
      [
        Name.trim(),
        Description?.trim() || null,
        StartDate || null,
        EndDate || null,
        ExhibitionType.trim(),
        GalleryID || null,
        ManagerID || null,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Exhibition not found' });
    }

    res.json({ message: 'Exhibition updated successfully' });
    } catch (error) {
      return handleDatabaseError(
        res,
        error,
        'Failed to update exhibition'
      );
    }
});

// Delete an exhibition
app.delete('/api/exhibitions/:id', requireAuth, requireAdminOrCurator, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM EXHIBITION WHERE ExhibitionID = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Exhibition not found' });
    }

    res.json({ message: 'Exhibition deleted successfully' });
  } catch (error) {
    console.error('Error deleting exhibition:', error.message);
    res.status(500).json({ error: 'Failed to delete exhibition' });
  }
});

// Get all galleries
app.get('/api/galleries', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM GALLERY')
    res.json(rows)
  } catch (error) {
    console.error('Error fetching galleries:', error.message)
    res.status(500).json({ error: 'Failed to fetch galleries' })
  }
})

// Add a gallery
app.post('/api/galleries', requireAuth, requireAdmin, async (req, res) => {
  const { GalleryID, Name, Location, Description } = req.body

  if (!GalleryID || !Name?.trim()) {
    return res.status(400).json({
      error: 'Gallery ID and name are required'
    })
  }

  try {
    await db.query(
      `INSERT INTO GALLERY (GalleryID, Name, Location, Description)
       VALUES (?, ?, ?, ?)`,
      [
        GalleryID,
        Name.trim(),
        Location?.trim() || null,
        Description?.trim() || null
      ]
    )

    res.status(201).json({ message: 'Gallery added successfully' })
  } catch (error) {
    console.error('Error adding gallery:', error.message)
    res.status(500).json({ error: 'Failed to add gallery' })
  }
})

// Update a gallery
app.put('/api/galleries/:id', requireAuth, requireAdmin, async (req, res) => {
  const { Name, Location, Description } = req.body

  if (!Name?.trim()) {
    return res.status(400).json({ error: 'Gallery name is required' })
  }

  try {
    const [result] = await db.query(
      `UPDATE GALLERY
       SET Name = ?, Location = ?, Description = ?
       WHERE GalleryID = ?`,
      [
        Name.trim(),
        Location?.trim() || null,
        Description?.trim() || null,
        req.params.id
      ]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Gallery not found' })
    }

    res.json({ message: 'Gallery updated successfully' })
  } catch (error) {
    console.error('Error updating gallery:', error.message)
    res.status(500).json({ error: 'Failed to update gallery' })
  }
})

// Delete a gallery
app.delete('/api/galleries/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM GALLERY WHERE GalleryID = ?',
      [req.params.id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Gallery not found' })
    }

    res.json({ message: 'Gallery deleted successfully' })
  } catch (error) {
    console.error('Error deleting gallery:', error.message)
    res.status(500).json({
      error: 'Failed to delete gallery. It may be referenced by an exhibition.'
    })
  }
})

// Add a new artwork
app.post('/api/artworks', requireAuth, requireAdminOrCurator, async (req, res) => {
  try {
    const {
      ArtworkID,
      Name,
      Description,
      Type,
      Origin,
      CreationYear,
      ArtistIDs
    } = req.body;

    if (ArtworkID == null || !Name || Name.trim() === '') {
      return res.status(400).json({
        error: 'ArtworkID and Name are required'
      });
    }

    const year = CreationYear === '' || CreationYear == null
      ? null
      : Number(CreationYear);

    if (year !== null && (!Number.isInteger(year) || year < 1 || year > 9999)) {
      return res.status(400).json({
        error: 'CreationYear must be a valid year'
      });
    }

    const creationDate = year === null
      ? null
      : `${String(year).padStart(4, '0')}-01-01`;

    await db.query(
      `INSERT INTO ARTWORK
       (ArtworkID, Name, Description, Type, Origin, CreationDate)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ArtworkID,
        Name.trim(),
        Description || null,
        Type || null,
        Origin || null,
        creationDate
      ]
    );

    for (const artistID of ArtistIDs || []) {
      await db.query(
        `INSERT INTO ARTIST_ARTWORK (ArtistID, ArtworkID)
        VALUES (?, ?)`,
        [artistID, ArtworkID]
      );
    }

    res.status(201).json({
      message: 'Artwork added successfully'
    });
  } catch (error) {
    console.error('Error adding artwork:', error.message);
    res.status(500).json({ error: 'Failed to add artwork' });
  }
});

// Update an existing artwork
app.put('/api/artworks/:id', requireAuth, requireAdminOrCurator, async (req, res) => {
  try {
    const {
      Name,
      Description,
      Type,
      Origin,
      CreationYear,
      ArtistIDs
    } = req.body;

    if (!Name || Name.trim() === '') {
      return res.status(400).json({
        error: 'Name is required'
      });
    }

    const year = CreationYear === '' || CreationYear == null
      ? null
      : Number(CreationYear);

    if (year !== null && (!Number.isInteger(year) || year < 1 || year > 9999)) {
      return res.status(400).json({
        error: 'CreationYear must be a valid year'
      });
    }

    const creationDate = year === null
      ? null
      : `${String(year).padStart(4, '0')}-01-01`;

    const [result] = await db.query(
      `UPDATE ARTWORK
       SET Name = ?, Description = ?, Type = ?, Origin = ?, CreationDate = ?
       WHERE ArtworkID = ?`,
      [
        Name.trim(),
        Description || null,
        Type || null,
        Origin || null,
        creationDate,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.query(
        'SELECT ArtworkID FROM ARTWORK WHERE ArtworkID = ?',
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Artwork not found'
        });
      }
    }

    await db.query(
      'DELETE FROM ARTIST_ARTWORK WHERE ArtworkID = ?',
      [req.params.id]
    );

    for (const artistID of ArtistIDs || []) {
      await db.query(
        `INSERT INTO ARTIST_ARTWORK (ArtistID, ArtworkID)
        VALUES (?, ?)`,
        [artistID, req.params.id]
      );
    }

    res.json({
      message: 'Artwork updated successfully'
    });
  } catch (error) {
    console.error('Error updating artwork:', error.message);
    res.status(500).json({ error: 'Failed to update artwork' });
  }
});

// Delete an artwork
app.delete('/api/artworks/:id', requireAuth, requireAdminOrCurator, async (req, res) => {
  try {
    const artworkID = req.params.id;

    await db.query(
      'DELETE FROM ARTIST_ARTWORK WHERE ArtworkID = ?',
      [artworkID]
    );

    await db.query(
      'DELETE FROM EXHIBITION_ARTWORK WHERE ArtworkID = ?',
      [artworkID]
    );

    const [result] = await db.query(
      'DELETE FROM ARTWORK WHERE ArtworkID = ?',
      [artworkID]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    console.error('Error deleting artwork:', error);
    res.status(500).json({ error: 'Failed to delete artwork' });
  }
});


/* =========================
   VISITOR ROUTES
========================= */

// Get all visitors
app.get('/api/visitors', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT VisitorID, FirstName, MiddleName, LastName, Email, Phone FROM VISITOR ORDER BY VisitorID'
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching visitors:', error.message);
    res.status(500).json({ error: 'Failed to fetch visitors' });
  }
});

// Add a visitor
app.post('/api/visitors', requireAuth, requireAdmin, async (req, res) => {
  const FirstName = String(req.body.FirstName || '').trim();
  const MiddleName = String(req.body.MiddleName || '').trim();
  const LastName = String(req.body.LastName || '').trim();
  const Email = String(req.body.Email || '').trim().toLowerCase();
  const Phone = String(req.body.Phone || '').trim();

  if (!FirstName || !LastName) {
    return res.status(400).json({
      error: 'First name and last name are required'
    });
  }

  if (
    FirstName.length > 30 ||
    MiddleName.length > 30 ||
    LastName.length > 30 ||
    Email.length > 50 ||
    Phone.length > 15
  ) {
    return res.status(400).json({
      error: 'One or more fields exceed the allowed length'
    });
  }

  try {
    const [nextIDs] = await db.query(
      'SELECT COALESCE(MAX(VisitorID), 0) + 1 AS nextID FROM VISITOR'
    );

    await db.query(
      `INSERT INTO VISITOR
       (VisitorID, FirstName, MiddleName, LastName, Email, Phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nextIDs[0].nextID,
        FirstName,
        MiddleName || null,
        LastName,
        Email || null,
        Phone || null
      ]
    );

    res.status(201).json({ message: 'Visitor added successfully' });
  } catch (error) {
    console.error('Error adding visitor:', error.message);
    res.status(500).json({
      error: 'Failed to add visitor. Check that the visitor ID is unique.'
    });
  }
});

// Update a visitor
app.put('/api/visitors/:id', requireAuth, requireAdmin, async (req, res) => {
  const FirstName = String(req.body.FirstName || '').trim();
  const MiddleName = String(req.body.MiddleName || '').trim();
  const LastName = String(req.body.LastName || '').trim();
  const Email = String(req.body.Email || '').trim().toLowerCase();
  const Phone = String(req.body.Phone || '').trim();

  if (!FirstName || !LastName) {
    return res.status(400).json({
      error: 'First name and last name are required'
    });
  }

  if (
    FirstName.length > 30 ||
    MiddleName.length > 30 ||
    LastName.length > 30 ||
    Email.length > 50 ||
    Phone.length > 15
  ) {
    return res.status(400).json({
      error: 'One or more fields exceed the allowed length'
    });
  }

  try {
    const [result] = await db.query(
      `UPDATE VISITOR
       SET FirstName = ?, MiddleName = ?, LastName = ?, Email = ?, Phone = ?
       WHERE VisitorID = ?`,
      [
        FirstName,
        MiddleName || null,
        LastName,
        Email || null,
        Phone || null,
        req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      const [rows] = await db.query(
        'SELECT VisitorID FROM VISITOR WHERE VisitorID = ?',
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Visitor not found' });
      }
    }

    res.json({ message: 'Visitor updated successfully' });
  } catch (error) {
    console.error('Error updating visitor:', error.message);
    res.status(500).json({ error: 'Failed to update visitor' });
  }
});

// Delete a visitor only if no related records exist
app.delete('/api/visitors/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const visitorID = Number(req.params.id);

    if (!Number.isInteger(visitorID) || visitorID <= 0) {
      return res.status(400).json({ error: 'Invalid visitor ID' });
    }

    const [visitors] = await db.query(
      'SELECT VisitorID FROM VISITOR WHERE VisitorID = ?',
      [visitorID]
    );

    if (visitors.length === 0) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    const [tickets] = await db.query(
      'SELECT 1 FROM TICKET WHERE VisitorID = ? LIMIT 1',
      [visitorID]
    );

    const [memberships] = await db.query(
      'SELECT 1 FROM MEMBERSHIP WHERE VisitorID = ? LIMIT 1',
      [visitorID]
    );

    if (
      tickets.length > 0 ||
      memberships.length > 0
    ) {
      return res.status(409).json({
        error: 'This visitor has tickets, memberships, or an account and cannot be deleted.'
      });
    }

    await db.query(
      'DELETE FROM USER_ACCOUNT WHERE VisitorID = ?',
      [visitorID]
    );

    await db.query(
      'DELETE FROM VISITOR WHERE VisitorID = ?',
      [visitorID]
    );

    res.json({ message: 'Visitor deleted successfully' });
  } catch (error) {
    console.error('Error deleting visitor:', error.message);
    res.status(500).json({ error: 'Failed to delete visitor' });
  }
});


// Get all employees
app.get('/api/employees', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
          e.EmployeeID,
          e.FirstName,
          e.MiddleName,
          e.LastName,
          e.Phone,
          e.Email,
          e.Salary,
          e.Sex,
          e.BirthDate,
          e.SupervisorID,
          CONCAT(s.FirstName, ' ', s.LastName) AS SupervisorName
      FROM EMPLOYEE e
      LEFT JOIN EMPLOYEE s
          ON e.SupervisorID = s.EmployeeID
      ORDER BY e.EmployeeID`
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching employees:', error.message)
    res.status(500).json({ error: 'Failed to fetch employees' })
  }
})

// Get employees for supervisor dropdown
app.get('/api/employee-options', requireAuth, requireAdmin, async (req, res) => {
  try{
    const [rows] = await db.query(
      `SELECT EmployeeID, FirstName, LastName
       FROM EMPLOYEE
       ORDER BY FirstName, LastName`
    )

    res.json(rows)
  } catch (error) {
    console.error('Error fetching employee options:', error.message)
    res.status(500).json({ error: 'Failed to fetch employee options' })
  }
})

// Get sensitive employee details (admin only)
app.get('/api/employees/:id/sensitive', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT SSN, Street, City, State, ZIPCode
       FROM EMPLOYEE
       WHERE EmployeeID = ?`,
      [req.params.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    res.json(rows[0])
  } catch (error) {
    console.error('Error fetching sensitive employee details:', error.message)
    res.status(500).json({ error: 'Failed to fetch employee details' })
  }
})

// Add an employee
app.post('/api/employees', requireAuth, requireAdmin, async (req, res) => {
  const {
    EmployeeID, FirstName, MiddleName, LastName, SSN,
    Street, City, State, ZIPCode, Phone, Email,
    Salary, Sex, BirthDate, SupervisorID
  } = req.body

  if (!EmployeeID || !FirstName?.trim() || !LastName?.trim()) {
    return res.status(400).json({
      error: 'Employee ID, first name, and last name are required'
    })
  }

  try {
    await db.query(
      `INSERT INTO EMPLOYEE (
        EmployeeID, FirstName, MiddleName, LastName, SSN,
        Street, City, State, ZIPCode, Phone, Email,
        Salary, Sex, BirthDate, SupervisorID
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        EmployeeID,
        FirstName.trim(),
        MiddleName?.trim() || null,
        LastName.trim(),
        SSN?.trim() || null,
        Street?.trim() || null,
        City?.trim() || null,
        State?.trim() || null,
        ZIPCode?.trim() || null,
        Phone?.trim() || null,
        Email?.trim() || null,
        Salary === '' || Salary == null ? null : Salary,
        Sex || null,
        BirthDate || null,
        SupervisorID === '' || SupervisorID == null ? null : SupervisorID
      ]
    )

    res.status(201).json({ message: 'Employee added successfully' })
  } catch (error) {
    console.error('Error adding employee:', error.message)
    res.status(500).json({
      error: 'Failed to add employee. Check that the employee ID is unique and the supervisor exists.'
    })
  }
})

// Update an employee
app.put('/api/employees/:id', requireAuth, requireAdmin, async (req, res) => {
  const {
    FirstName, MiddleName, LastName, SSN,
    Street, City, State, ZIPCode, Phone, Email,
    Salary, Sex, BirthDate, SupervisorID
  } = req.body

  if (!FirstName?.trim() || !LastName?.trim()) {
    return res.status(400).json({
      error: 'First name and last name are required'
    })
  }

  try {
    const [result] = await db.query(
      `UPDATE EMPLOYEE SET
        FirstName = ?, MiddleName = ?, LastName = ?, SSN = ?,
        Street = ?, City = ?, State = ?, ZIPCode = ?, Phone = ?,
        Email = ?, Salary = ?, Sex = ?, BirthDate = ?, SupervisorID = ?
       WHERE EmployeeID = ?`,
      [
        FirstName.trim(),
        MiddleName?.trim() || null,
        LastName.trim(),
        SSN?.trim() || null,
        Street?.trim() || null,
        City?.trim() || null,
        State?.trim() || null,
        ZIPCode?.trim() || null,
        Phone?.trim() || null,
        Email?.trim() || null,
        Salary === '' || Salary == null ? null : Salary,
        Sex || null,
        BirthDate || null,
        SupervisorID === '' || SupervisorID == null ? null : SupervisorID,
        req.params.id
      ]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    res.json({ message: 'Employee updated successfully' })
  } catch (error) {
    console.error('Error updating employee:', error.message)
    res.status(500).json({
      error: 'Failed to update employee. Check that the supervisor exists.'
    })
  }
})

// Delete an employee
app.delete('/api/employees/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM EMPLOYEE WHERE EmployeeID = ?',
      [req.params.id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    res.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    console.error('Error deleting employee:', error.message)
    res.status(500).json({
      error: 'Failed to delete employee. Another record may reference this employee.'
    })
  }
})


/* =========================
   TICKET ROUTES
========================= */

// Get tickets with visitor and exhibition names
app.get('/api/tickets', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        T.TicketID,
        T.PurchaseDate,
        T.VisitDate,
        T.Price,
        T.Type,
        T.Status,
        T.VisitorID,
        T.ExhibitionID,
        T.GeneralAdmissionTicketID,
        V.FirstName,
        V.LastName,
        E.Name AS ExhibitionName
      FROM TICKET T
      JOIN VISITOR V ON T.VisitorID = V.VisitorID
      LEFT JOIN EXHIBITION E ON T.ExhibitionID = E.ExhibitionID
      ORDER BY T.TicketID
    `)

    res.json(rows)
  } catch (error) {
    console.error('Error fetching tickets:', error.message)
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
})

app.get('/api/my-tickets', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'VISITOR' || !req.user.VisitorID) {
      return res.status(403).json({ error: 'Visitor account required.' })
    }

    const [tickets] = await db.execute(
      `SELECT TicketID, PurchaseDate, VisitDate, Price, Type,
        VisitorID, ExhibitionID, GeneralAdmissionTicketID, Status
        FROM TICKET
        WHERE VisitorID = ?
        ORDER BY VisitDate DESC`,
      [req.user.VisitorID]
    )

    res.json(tickets)
  } catch (error) {
    console.error('Error fetching visitor tickets:', error)
    res.status(500).json({ error: 'Could not load your tickets.' })
  }
})

// Cancel one of the logged-in visitor's tickets
app.put('/api/my-tickets/:id/cancel', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'VISITOR' || !req.user.VisitorID) {
      return res.status(403).json({
        error: 'Visitor account required.'
      });
    }

    const ticketID = Number(req.params.id);

    if (!Number.isInteger(ticketID) || ticketID <= 0) {
      return res.status(400).json({
        error: 'Invalid ticket ID.'
      });
    }

    const [result] = await db.execute(
      `UPDATE TICKET
       SET Status = 'Cancelled'
       WHERE TicketID = ?
         AND VisitorID = ?
         AND Status = 'Active'
         AND VisitDate >= CURDATE()`,
      [ticketID, req.user.VisitorID]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        error: 'Ticket could not be cancelled. It may not belong to you, may already be cancelled, or its visit date may have passed.'
      });
    }

    res.json({
      message: 'Ticket cancelled successfully.'
    });
  } catch (error) {
    console.error('Error cancelling ticket:', error.message);
    res.status(500).json({
      error: 'Could not cancel ticket.'
    });
  }
});

// Get visitors for the ticket form
app.get('/api/ticket-options/visitors', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT VisitorID, FirstName, LastName
      FROM VISITOR
      ORDER BY LastName, FirstName
    `)

    res.json(rows)
  } catch (error) {
    console.error('Error fetching ticket visitors:', error.message)
    res.status(500).json({ error: 'Failed to load visitors' })
  }
})

// Get exhibitions for the ticket form
app.get('/api/ticket-options/exhibitions', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ExhibitionID, Name
      FROM EXHIBITION
      ORDER BY Name
    `)

    res.json(rows)
  } catch (error) {
    console.error('Error fetching ticket exhibitions:', error.message)
    res.status(500).json({ error: 'Failed to load exhibitions' })
  }
})

// Add a ticket
app.post('/api/tickets', requireAuth, requireAdminOrClerk, async (req, res) => {
  const {
    TicketID,
    PurchaseDate,
    VisitDate,
    Price,
    Type,
    VisitorID,
    ExhibitionID,
    GeneralAdmissionTicketID
  } = req.body

  if (
    TicketID == null ||
    TicketID === '' ||
    !Type?.trim() ||
    VisitorID == null ||
    VisitorID === ''
  ) {
    return res.status(400).json({
      error: 'Ticket ID, type, and visitor are required'
    })
  }

  try {
    await db.query(
      `INSERT INTO TICKET (
        TicketID, PurchaseDate, VisitDate, Price, Type,
        VisitorID, ExhibitionID, GeneralAdmissionTicketID
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        TicketID,
        PurchaseDate || null,
        VisitDate || null,
        Price === '' || Price == null ? null : Price,
        Type.trim(),
        VisitorID,
        ExhibitionID === '' || ExhibitionID == null ? null : ExhibitionID,
        GeneralAdmissionTicketID === '' || GeneralAdmissionTicketID == null
          ? null
          : GeneralAdmissionTicketID
      ]
    )

    res.status(201).json({ message: 'Ticket added successfully' })
    } catch (error) {
    return handleDatabaseError(
      res,
      error,
      'Failed to add ticket. Check the ticket ID and related records.'
    )
  }
})


app.post('/api/tickets/purchase', requireAuth, async (req, res) => {
  const visitorID = req.user.VisitorID;
  const { Type, VisitDate, Quantity, ExhibitionID } = req.body;

  if (req.user.role !== 'VISITOR' || !visitorID) {
    return res.status(403).json({
      error: 'A visitor account is required to purchase tickets.'
    });
  }

  if (!['General Admission', 'Single Exhibition'].includes(Type)) {
    return res.status(400).json({ error: 'Invalid ticket type.' });
  }

  if (
    typeof VisitDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(VisitDate) ||
    !Number.isInteger(Quantity) ||
    Quantity < 1 ||
    Quantity > 10
  ) {
    return res.status(400).json({
      error: 'Choose a valid visit date and quantity between 1 and 10.'
    });
  }

  if (VisitDate < new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({
      error: 'Visit date cannot be in the past.'
    });
  }

  const price = Type === 'General Admission' ? 18.00 : 12.00;
  const totalPrice = Type === 'General Admission'
    ? price * Quantity
    : 30.00 * Quantity;
  const connection = await db.getConnection();

  try {
    if (Type === 'Single Exhibition') {
      if (!Number.isInteger(Number(ExhibitionID))) {
        return res.status(400).json({
          error: 'Please select an exhibition.'
        });
      }

      const [exhibitions] = await connection.query(
        'SELECT ExhibitionID FROM EXHIBITION WHERE ExhibitionID = ?',
        [Number(ExhibitionID)]
      );

      if (exhibitions.length === 0) {
        return res.status(400).json({
          error: 'The selected exhibition does not exist.'
        });
      }
    }

    await connection.beginTransaction();

    const ticketIDs = [];

    for (let i = 0; i < Quantity; i++) {
      let generalAdmissionTicketID = null;

      if (Type === 'Single Exhibition') {
        const [generalResult] = await connection.query(
          `INSERT INTO TICKET
          (PurchaseDate, VisitDate, Price, Type, VisitorID,
            ExhibitionID, GeneralAdmissionTicketID)
          VALUES (CURDATE(), ?, 18.00, 'General Admission', ?, NULL, NULL)`,
          [VisitDate, visitorID]
        );

        generalAdmissionTicketID = generalResult.insertId;
        ticketIDs.push(generalAdmissionTicketID);
      }

      const [result] = await connection.query(
        `INSERT INTO TICKET
        (PurchaseDate, VisitDate, Price, Type, VisitorID,
          ExhibitionID, GeneralAdmissionTicketID)
        VALUES (CURDATE(), ?, ?, ?, ?, ?, ?)`,
        [
          VisitDate,
          Type === 'General Admission' ? 18.00 : 12.00,
          Type,
          visitorID,
          Type === 'Single Exhibition' ? Number(ExhibitionID) : null,
          generalAdmissionTicketID
        ]
      );

      ticketIDs.push(result.insertId);
    }

    await connection.commit();

    res.status(201).json({
      message: 'Ticket purchase recorded successfully.',
      ticketIDs,
      quantity: Quantity,
      total: Number(totalPrice.toFixed(2))
    });
    } catch (error) {
      await connection.rollback();

      return handleDatabaseError(
        res,
        error,
        'Could not complete the ticket purchase.'
      );
    } finally {
      connection.release();
    }
});



// Update a ticket
app.put('/api/tickets/:id', requireAuth, requireAdminOrClerk, async (req, res) => {
  const {
    PurchaseDate,
    VisitDate,
    Price,
    Type,
    VisitorID,
    ExhibitionID,
    GeneralAdmissionTicketID
  } = req.body

  if (!Type?.trim() || VisitorID == null || VisitorID === '') {
    return res.status(400).json({
      error: 'Ticket type and visitor are required'
    })
  }

  try {
    const [result] = await db.query(
      `UPDATE TICKET SET
        PurchaseDate = ?,
        VisitDate = ?,
        Price = ?,
        Type = ?,
        VisitorID = ?,
        ExhibitionID = ?,
        GeneralAdmissionTicketID = ?
      WHERE TicketID = ?`,
      [
        PurchaseDate || null,
        VisitDate || null,
        Price === '' || Price == null ? null : Price,
        Type.trim(),
        VisitorID,
        ExhibitionID === '' || ExhibitionID == null ? null : ExhibitionID,
        GeneralAdmissionTicketID === '' || GeneralAdmissionTicketID == null
          ? null
          : GeneralAdmissionTicketID,
        req.params.id
      ]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    res.json({ message: 'Ticket updated successfully' })
    } catch (error) {
      return handleDatabaseError(
        res,
        error,
        'Failed to update ticket. Check the related records.'
      )
    }
})

// Delete a ticket
app.delete('/api/tickets/:id', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM TICKET WHERE TicketID = ?',
      [req.params.id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    res.json({ message: 'Ticket deleted successfully' })
  } catch (error) {
    console.error('Error deleting ticket:', error.message)
    res.status(500).json({
      error: 'Failed to delete ticket. It may be referenced by another record.'
    })
  }
})


// Get all stores
app.get('/api/stores', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM STORE ORDER BY StoreID'
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching stores:', error.message)
    res.status(500).json({ error: 'Failed to fetch stores' })
  }
})

// Add a store
app.post('/api/stores', requireAuth, requireAdminOrClerk, async (req, res) => {
  const { StoreID, Name, Type, Location } = req.body

  if (
    StoreID == null ||
    StoreID === '' ||
    !Name?.trim() ||
    !Type?.trim()
  ) {
    return res.status(400).json({
      error: 'Store ID, name, and type are required'
    })
  }

  try {
    await db.query(
      `INSERT INTO STORE (StoreID, Name, Type, Location)
       VALUES (?, ?, ?, ?)`,
      [
        StoreID,
        Name.trim(),
        Type.trim(),
        Location?.trim() || null
      ]
    )

    res.status(201).json({ message: 'Store added successfully' })
  } catch (error) {
    console.error('Error adding store:', error.message)
    res.status(500).json({
      error: 'Failed to add store. Check that the store ID is unique.'
    })
  }
})

// Update a store
app.put('/api/stores/:id', requireAuth, requireAdminOrClerk, async (req, res) => {
  const { Name, Type, Location } = req.body

  if (!Name?.trim() || !Type?.trim()) {
    return res.status(400).json({
      error: 'Store name and type are required'
    })
  }

  try {
    const [result] = await db.query(
      `UPDATE STORE
       SET Name = ?, Type = ?, Location = ?
       WHERE StoreID = ?`,
      [
        Name.trim(),
        Type.trim(),
        Location?.trim() || null,
        req.params.id
      ]
    )

    if (result.affectedRows === 0) {
      const [rows] = await db.query(
        'SELECT StoreID FROM STORE WHERE StoreID = ?',
        [req.params.id]
      )

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Store not found' })
      }
    }

    res.json({ message: 'Store updated successfully' })
  } catch (error) {
    console.error('Error updating store:', error.message)
    res.status(500).json({ error: 'Failed to update store' })
  }
})

// Delete a store
app.delete('/api/stores/:id', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM STORE WHERE StoreID = ?',
      [req.params.id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Store not found' })
    }

    res.json({ message: 'Store deleted successfully' })
  } catch (error) {
    console.error('Error deleting store:', error.message)
    res.status(500).json({
      error: 'Failed to delete store. Another record may reference it.'
    })
  }
})


app.get('/api/my-memberships', requireAuth, async (req, res) => {
  if (req.user.role !== 'VISITOR' || !req.user.VisitorID) {
    return res.status(403).json({
      error: 'A visitor account is required.'
    });
  }
  try {
    const [rows] = await db.query(
      `SELECT MembershipID, MembershipType, StartDate, EndDate, Price
       FROM MEMBERSHIP
       WHERE VisitorID = ?
       ORDER BY StartDate DESC`,
      [req.user.VisitorID]
    )

    res.json(rows)
  } catch (error) {
    console.error('Error fetching memberships:', error.message)
    res.status(500).json({ error: 'Failed to fetch memberships' })
  }
})

// Get all memberships for the admin page
app.get('/api/memberships', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        M.MembershipID,
        M.VisitorID,
        V.FirstName,
        V.LastName,
        V.Email,
        M.MembershipType,
        M.StartDate,
        M.EndDate,
        M.Price
      FROM MEMBERSHIP M
      LEFT JOIN VISITOR V ON M.VisitorID = V.VisitorID
      ORDER BY M.MembershipID
    `)

    res.json(rows)
  } catch (error) {
    console.error('Error fetching memberships:', error.message)
    res.status(500).json({ error: 'Failed to fetch memberships' })
  }
})


 // Add a membership to a visitor (admin only)
app.post('/api/memberships', requireAuth, requireAdmin, async (req, res) => {
  const { VisitorID, MembershipType } = req.body;
  const visitorID = Number(VisitorID);

  if (!Number.isInteger(visitorID) || visitorID <= 0) {
    return res.status(400).json({ error: 'Invalid visitor ID.' });
  }

  try {
    const [types] = await db.query(
      'SELECT Price FROM MEMBERSHIP_TYPE WHERE MembershipType = ?',
      [MembershipType]
    );

    if (types.length === 0) {
      return res.status(400).json({ error: 'Invalid membership type.' });
    }

    const price = types[0].Price;

    const [visitors] = await db.query(
      'SELECT VisitorID FROM VISITOR WHERE VisitorID = ?',
      [visitorID]
    );

    if (visitors.length === 0) {
      return res.status(404).json({ error: 'Visitor not found.' });
    }

    const [existing] = await db.query(
      `SELECT MembershipID FROM MEMBERSHIP
       WHERE VisitorID = ?
         AND (EndDate IS NULL OR EndDate >= CURDATE())
       LIMIT 1`,
      [visitorID]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'This visitor already has an active membership.'
      });
    }

    const [ids] = await db.query(
      'SELECT COALESCE(MAX(MembershipID), 0) + 1 AS nextID FROM MEMBERSHIP'
    );

    const membershipID = ids[0].nextID;

    await db.query(
      `INSERT INTO MEMBERSHIP
       (MembershipID, VisitorID, MembershipType, StartDate, EndDate, Price)
       VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), ?)`,
      [membershipID, visitorID, MembershipType, price]
    );

    res.status(201).json({
      message: 'Membership added to visitor successfully.',
      MembershipID: membershipID
    });
  } catch (error) {
    console.error('Error adding membership:', error.message);
    res.status(500).json({ error: 'Failed to add membership.' });
  }
});

app.get('/api/membership-types', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT MembershipType, Price FROM MEMBERSHIP_TYPE ORDER BY MembershipType'
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching membership types:', error.message);
    res.status(500).json({ error: 'Failed to fetch membership types.' });
  }
});


// Add a membership type
app.post('/api/membership-types', requireAuth, requireAdmin, async (req, res) => {
  const MembershipType = String(req.body.MembershipType || '').trim();
  const Price = Number(req.body.Price);

  if (!MembershipType || MembershipType.length > 30 ||
      !Number.isFinite(Price) || Price < 0) {
    return res.status(400).json({ error: 'Invalid membership type or price.' });
  }

  try {
    const [existing] = await db.query(
      'SELECT MembershipType FROM MEMBERSHIP_TYPE WHERE MembershipType = ?',
      [MembershipType]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'This membership type already exists.' });
    }

    await db.query(
      'INSERT INTO MEMBERSHIP_TYPE (MembershipType, Price) VALUES (?, ?)',
      [MembershipType, Price]
    );

    res.status(201).json({ message: 'Membership type added successfully.' });
  } catch (error) {
    console.error('Error adding membership type:', error.message);
    res.status(500).json({ error: 'Failed to add membership type.' });
  }
});


// Edit a membership type
app.put('/api/membership-types/:type', requireAuth, requireAdmin, async (req, res) => {
  const oldType = req.params.type;
  const MembershipType = String(req.body.MembershipType || '').trim();
  const Price = Number(req.body.Price);

  if (!MembershipType || MembershipType.length > 30 ||
      !Number.isFinite(Price) || Price < 0) {
    return res.status(400).json({ error: 'Invalid membership type or price.' });
  }

  try {
    const [existing] = await db.query(
      'SELECT MembershipType FROM MEMBERSHIP_TYPE WHERE MembershipType = ?',
      [oldType]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Membership type not found.' });
    }

    if (MembershipType !== oldType) {
      const [duplicate] = await db.query(
        'SELECT MembershipType FROM MEMBERSHIP_TYPE WHERE MembershipType = ?',
        [MembershipType]
      );

      if (duplicate.length > 0) {
        return res.status(409).json({ error: 'This membership type already exists.' });
      }
    }

    await db.query(
      `UPDATE MEMBERSHIP_TYPE
       SET MembershipType = ?, Price = ?
       WHERE MembershipType = ?`,
      [MembershipType, Price, oldType]
    );

    res.json({ message: 'Membership type updated successfully.' });
  } catch (error) {
    console.error('Error updating membership type:', error.message);
    res.status(500).json({ error: 'Failed to update membership type.' });
  }
});


// Delete a membership type
app.delete('/api/membership-types/:type', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM MEMBERSHIP_TYPE WHERE MembershipType = ?',
      [req.params.type]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Membership type not found.' });
    }

    res.json({ message: 'Membership type deleted successfully.' });
  } catch (error) {
    console.error('Error deleting membership type:', error.message);
    res.status(500).json({ error: 'Failed to delete membership type.' });
  }
});



// Delete a membership (admin only)
app.delete(
  '/api/memberships/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const membershipID = Number(req.params.id)

      if (!Number.isInteger(membershipID) || membershipID <= 0) {
        return res.status(400).json({ error: 'Invalid membership ID.' })
      }

      const [result] = await db.query(
        'DELETE FROM MEMBERSHIP WHERE MembershipID = ?',
        [membershipID]
      )

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Membership not found.' })
      }

      res.json({ message: 'Membership deleted successfully.' })
    } catch (error) {
      console.error('Error deleting membership:', error.message)
      res.status(500).json({ error: 'Failed to delete membership.' })
    }
  }
)

// Cancel one of the logged-in visitor's memberships
app.delete('/api/my-memberships/:membershipID', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'VISITOR' || !req.user.VisitorID) {
      return res.status(403).json({
        error: 'A visitor account is required.'
      });
    }

    const membershipID = Number(req.params.membershipID);

    if (!Number.isInteger(membershipID) || membershipID <= 0) {
      return res.status(400).json({
        error: 'Invalid membership ID.'
      });
    }

    const [result] = await db.execute(
      `DELETE FROM MEMBERSHIP
       WHERE MembershipID = ? AND VisitorID = ?`,
      [membershipID, req.user.VisitorID]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Membership not found or does not belong to you.'
      });
    }

    res.json({
      message: 'Membership cancelled successfully.'
    });
  } catch (error) {
    console.error('Error cancelling membership:', error.message);
    res.status(500).json({
      error: 'Could not cancel membership.'
    });
  }
});

app.post('/api/memberships/purchase', requireAuth, async (req, res) => {
  const visitorID = req.user.VisitorID;
  const { MembershipType } = req.body;

  if (req.user.role !== 'VISITOR' || !visitorID) {
    return res.status(403).json({
      error: 'A visitor account is required.'
    });
  }

  try {
    const [types] = await db.query(
      'SELECT Price FROM MEMBERSHIP_TYPE WHERE MembershipType = ?',
      [MembershipType]
    );

    if (types.length === 0) {
      return res.status(400).json({ error: 'Invalid membership type.' });
    }

    const price = types[0].Price;

    const [existing] = await db.query(
      `SELECT MembershipID FROM MEMBERSHIP
       WHERE VisitorID = ?
         AND (EndDate IS NULL OR EndDate >= CURDATE())
       LIMIT 1`,
      [visitorID]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'You already have an active membership.'
      });
    }

    const [ids] = await db.query(
      'SELECT COALESCE(MAX(MembershipID), 0) + 1 AS nextID FROM MEMBERSHIP'
    );

    const membershipID = ids[0].nextID;

    await db.query(
      `INSERT INTO MEMBERSHIP
       (MembershipID, VisitorID, MembershipType, StartDate, EndDate, Price)
       VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), ?)`,
      [membershipID, visitorID, MembershipType, price]
    );

    res.status(201).json({
      message: 'Membership purchased successfully.'
    });
  } catch (error) {
    console.error('Error purchasing membership:', error.message);
    res.status(500).json({ error: 'Failed to purchase membership.' });
  }
});


app.get('/api/parking-lots', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ParkingLotID, Name, Location, Capacity, HourlyRate
       FROM PARKING_LOT
       ORDER BY ParkingLotID`
    )

    res.json(rows)
  } catch (error) {
    console.error('Error fetching parking lots:', error.message)
    res.status(500).json({ error: 'Failed to fetch parking lots' })
  }
})

// Create a parking reservation
app.post('/api/parking-passes/purchase', requireAuth, async (req, res) => {
  const visitorID = req.user.VisitorID;
  const { ParkingLotID, VisitDate, ArrivalTime, DepartureTime } = req.body;

  if (req.user.role !== 'VISITOR' || !visitorID) {
    return res.status(403).json({
      error: 'A visitor account is required to reserve parking.'
    });
  }

    const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(VisitDate || '') &&
    !Number.isNaN(Date.parse(VisitDate)) &&
    new Date(VisitDate).toISOString().slice(0, 10) === VisitDate;

  const validArrival =
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(ArrivalTime || '');

  const validDeparture =
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(DepartureTime || '');

  if (
    !Number.isInteger(Number(ParkingLotID)) ||
    Number(ParkingLotID) <= 0 ||
    !validDate ||
    !validArrival ||
    !validDeparture ||
    ArrivalTime >= DepartureTime
  ) {
    return res.status(400).json({
      error: 'Please provide valid parking reservation details.'
    });
  }

  if (VisitDate < new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({
      error: 'Visit date cannot be in the past.'
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [lots] = await connection.query(
      `SELECT HourlyRate
       FROM PARKING_LOT
       WHERE ParkingLotID = ?`,
      [Number(ParkingLotID)]
    );

    if (lots.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'The selected parking lot does not exist.'
      });
    }

    const arrival = ArrivalTime.split(':').map(Number);
    const departure = DepartureTime.split(':').map(Number);

    const arrivalMinutes = arrival[0] * 60 + arrival[1];
    const departureMinutes = departure[0] * 60 + departure[1];

    const duration = (departureMinutes - arrivalMinutes) / 60;

    const totalPrice = Number(
      (duration * Number(lots[0].HourlyRate)).toFixed(2)
    );

    const [result] = await connection.query(
      `INSERT INTO PARKING_PASS
       (ParkingLotID, VisitorID, VisitDate, ArrivalTime, DepartureTime, TotalPrice)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(ParkingLotID),
        visitorID,
        VisitDate,
        ArrivalTime,
        DepartureTime,
        totalPrice
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Parking reservation confirmed successfully.',
      ParkingPassID: result.insertId,
      totalPrice,
      duration
    });

  } catch (error) {
    await connection.rollback();

    return handleDatabaseError(
      res,
      error,
      'Could not complete the parking reservation.'
    );

  } finally {
    connection.release();
  }
});


// Get all parking passes
app.get('/api/parking-passes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        P.ParkingPassID,
        P.ParkingLotID,
        P.VisitorID,
        P.VisitDate,
        P.ArrivalTime,
        P.DepartureTime,
        P.TotalPrice,
        L.Name AS ParkingLotName,
        L.HourlyRate,
        V.FirstName,
        V.LastName
      FROM PARKING_PASS P
      JOIN PARKING_LOT L ON P.ParkingLotID = L.ParkingLotID
      JOIN VISITOR V ON P.VisitorID = V.VisitorID
      ORDER BY P.VisitDate DESC, P.ArrivalTime
    `)

    res.json(rows)
  } catch (error) {
    console.error('Error fetching parking passes:', error.message)
    res.status(500).json({ error: 'Failed to fetch parking passes.' })
  }
})


app.get('/api/my-parking-passes', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'VISITOR' || !req.user.VisitorID) {
      return res.status(403).json({
        error: 'Only visitors can view their parking passes.'
      })
    }

    const visitorID = req.user.VisitorID

    const [passes] = await db.query(
      `SELECT
        pp.ParkingPassID,
        pp.VisitDate,
        pp.ArrivalTime,
        pp.DepartureTime,
        pp.TotalPrice,
        pl.Name AS ParkingLotName
      FROM PARKING_PASS pp
      JOIN PARKING_LOT pl
        ON pp.ParkingLotID = pl.ParkingLotID
      WHERE pp.VisitorID = ?
      ORDER BY pp.VisitDate DESC`,
      [visitorID]
    )

    res.json(passes)
  } catch (error) {
    console.error('Error loading parking passes:', error)
    res.status(500).json({
      error: 'Failed to load parking passes.'
    })
  }
})

app.delete('/api/my-parking-passes/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'VISITOR' || !req.user.VisitorID) {
      return res.status(403).json({
        error: 'Only visitors can cancel their parking passes.'
      })
    }

    const [result] = await db.query(
      `DELETE FROM PARKING_PASS
       WHERE ParkingPassID = ?
       AND VisitorID = ?`,
      [req.params.id, req.user.VisitorID]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Parking pass not found.'
      })
    }

    res.json({ message: 'Parking pass cancelled successfully.' })
  } catch (error) {
    console.error('Error cancelling parking pass:', error)
    res.status(500).json({
      error: 'Failed to cancel parking pass.'
    })
  }
})

// Add a parking pass (admin only)
app.post('/api/parking-passes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { ParkingLotID, VisitorID, VisitDate, ArrivalTime, DepartureTime } = req.body

    const lotID = Number(ParkingLotID)
    const visitorID = Number(VisitorID)

    const validDate =
      /^\d{4}-\d{2}-\d{2}$/.test(VisitDate || '') &&
      !Number.isNaN(Date.parse(VisitDate)) &&
      new Date(VisitDate).toISOString().slice(0, 10) === VisitDate

    const validArrival =
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(ArrivalTime || '')

    const validDeparture =
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(DepartureTime || '')

    if (
      !Number.isInteger(lotID) || lotID <= 0 ||
      !Number.isInteger(visitorID) || visitorID <= 0 ||
      !validDate ||
      !validArrival ||
      !validDeparture ||
      ArrivalTime >= DepartureTime
    ) {
      return res.status(400).json({
        error: 'Please provide valid parking pass details.'
      })
    }

    const [lots] = await db.query(
      'SELECT HourlyRate FROM PARKING_LOT WHERE ParkingLotID = ?',
      [lotID]
    )

    if (lots.length === 0) {
      return res.status(404).json({ error: 'Parking lot not found.' })
    }

    const [visitors] = await db.query(
      'SELECT VisitorID FROM VISITOR WHERE VisitorID = ?',
      [visitorID]
    )

    if (visitors.length === 0) {
      return res.status(404).json({ error: 'Visitor not found.' })
    }

    const arrival = ArrivalTime.split(':').map(Number)
    const departure = DepartureTime.split(':').map(Number)

    const duration =
      (departure[0] * 60 + departure[1] -
       arrival[0] * 60 - arrival[1]) / 60

    const totalPrice = Number(
      (duration * Number(lots[0].HourlyRate)).toFixed(2)
    )

    const [result] = await db.query(
      `INSERT INTO PARKING_PASS
       (ParkingLotID, VisitorID, VisitDate, ArrivalTime, DepartureTime, TotalPrice)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [lotID, visitorID, VisitDate, ArrivalTime, DepartureTime, totalPrice]
    )

    res.status(201).json({
      message: 'Parking pass added successfully.',
      ParkingPassID: result.insertId
    })
  } catch (error) {
    console.error('Error adding parking pass:', error.message)
    return handleDatabaseError(res, error, 'Could not add parking pass.')
  }
})


//update a parking pass
app.put('/api/parking-passes/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const passID = Number(req.params.id)
    const { ParkingLotID, VisitorID, VisitDate, ArrivalTime, DepartureTime } = req.body

    const lotID = Number(ParkingLotID)
    const visitorID = Number(VisitorID)

    const validDate =
      /^\d{4}-\d{2}-\d{2}$/.test(VisitDate || '') &&
      !Number.isNaN(Date.parse(VisitDate)) &&
      new Date(VisitDate).toISOString().slice(0, 10) === VisitDate

    const validArrival =
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(ArrivalTime || '')

    const validDeparture =
      /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(DepartureTime || '')

    if (
      !Number.isInteger(passID) || passID <= 0 ||
      !Number.isInteger(lotID) || lotID <= 0 ||
      !Number.isInteger(visitorID) || visitorID <= 0 ||
      !validDate ||
      !validArrival ||
      !validDeparture ||
      ArrivalTime >= DepartureTime
    ) {
      return res.status(400).json({
        error: 'Please provide valid parking pass details.'
      })
    }

    const [lots] = await db.query(
      'SELECT HourlyRate FROM PARKING_LOT WHERE ParkingLotID = ?',
      [lotID]
    )

    if (lots.length === 0) {
      return res.status(404).json({ error: 'Parking lot not found.' })
    }

    const [visitors] = await db.query(
      'SELECT VisitorID FROM VISITOR WHERE VisitorID = ?',
      [visitorID]
    )

    if (visitors.length === 0) {
      return res.status(404).json({ error: 'Visitor not found.' })
    }

    const arrival = ArrivalTime.split(':').map(Number)
    const departure = DepartureTime.split(':').map(Number)

    const duration =
      (departure[0] * 60 + departure[1] -
       arrival[0] * 60 - arrival[1]) / 60

    const totalPrice = Number(
      (duration * Number(lots[0].HourlyRate)).toFixed(2)
    )

    const [result] = await db.query(
      `UPDATE PARKING_PASS
       SET ParkingLotID = ?,
           VisitorID = ?,
           VisitDate = ?,
           ArrivalTime = ?,
           DepartureTime = ?,
           TotalPrice = ?
       WHERE ParkingPassID = ?`,
      [lotID, visitorID, VisitDate, ArrivalTime, DepartureTime, totalPrice, passID]
    )

    if (result.affectedRows === 0) {
      const [existing] = await db.query(
        'SELECT ParkingPassID FROM PARKING_PASS WHERE ParkingPassID = ?',
        [passID]
      )

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Parking pass not found.' })
      }
    }

    res.json({ message: 'Parking pass updated successfully.' })
  } catch (error) {
    console.error('Error updating parking pass:', error.message)
    return handleDatabaseError(res, error, 'Could not update parking pass.')
  }
})


// Delete a parking pass
app.delete('/api/parking-passes/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const passID = Number(req.params.id)

    if (!Number.isInteger(passID) || passID <= 0) {
      return res.status(400).json({ error: 'Invalid parking pass ID.' })
    }

    const [result] = await db.query(
      'DELETE FROM PARKING_PASS WHERE ParkingPassID = ?',
      [passID]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Parking pass not found.' })
    }

    res.json({ message: 'Parking pass deleted successfully.' })
  } catch (error) {
    console.error('Error deleting parking pass:', error.message)
    return handleDatabaseError(res, error, 'Could not delete parking pass.')
  }
})

// Items

app.get('/api/stores/:id/items', async (req, res) => {
  try {
    const storeID = Number(req.params.id)

    if (!Number.isInteger(storeID) || storeID <= 0) {
      return res.status(400).json({ error: 'Invalid store ID' })
    }

    const [rows] = await db.query(
      `SELECT
         I.ItemID,
         I.Name,
         I.Price,
         SI.StockCount
       FROM STORE_ITEM SI
       JOIN ITEM I ON SI.ItemID = I.ItemID
       WHERE SI.StoreID = ?
       ORDER BY I.Name`,
      [storeID]
    )

    res.json(rows)
  } catch (error) {
    console.error('Error fetching store inventory:', error.message)
    res.status(500).json({ error: 'Failed to fetch store inventory' })
  }
})


app.post('/api/store-checkout', requireAuth, async (req, res) => {
  const connection = await db.getConnection()

  try {
    if (req.user.role !== 'VISITOR' || !req.user.VisitorID) {
      return res.status(403).json({
        error: 'A visitor account is required to make a purchase.'
      })
    }

    const items = req.body.items

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Your shopping cart is empty.'
      })
    }

    for (const item of items) {
      if (
        !Number.isInteger(Number(item.ItemID)) ||
        Number(item.ItemID) <= 0 ||
        !Number.isInteger(Number(item.StoreID)) ||
        Number(item.StoreID) <= 0 ||
        !Number.isInteger(Number(item.Quantity)) ||
        Number(item.Quantity) <= 0
      ) {
        return res.status(400).json({
          error: 'Invalid item or quantity.'
        })
      }
    }

    await connection.beginTransaction()

    let totalAmount = 0
    const verifiedItems = []

    for (const item of items) {
      const itemID = Number(item.ItemID)
      const storeID = Number(item.StoreID)
      const quantity = Number(item.Quantity)

      const [rows] = await connection.query(
        `SELECT I.Price, SI.StockCount
         FROM STORE_ITEM SI
         JOIN ITEM I ON SI.ItemID = I.ItemID
         WHERE SI.StoreID = ? AND SI.ItemID = ?
         FOR UPDATE`,
        [storeID, itemID]
      )

      if (rows.length === 0) {
        throw new Error('An item is no longer available.')
      }

      const price = Number(rows[0].Price)
      const stock = Number(rows[0].StockCount)

      if (!Number.isFinite(price) || price < 0) {
        throw new Error('An item has an invalid price.')
      }

      if (stock < quantity) {
        throw new Error('There is not enough stock for one of your items.')
      }

      totalAmount += price * quantity

      verifiedItems.push({
        ItemID: itemID,
        StoreID: storeID,
        Quantity: quantity,
        Price: price
      })
    }

    totalAmount = Number(totalAmount.toFixed(2))

    const shipping = req.body.shippingAddress

if (
  !shipping ||
  !shipping.firstName?.trim() ||
  !shipping.lastName?.trim() ||
  !shipping.address?.trim() ||
  !shipping.city?.trim() ||
  !shipping.state?.trim() ||
  !/^\d{5}$/.test(String(shipping.zip || ''))
) {
  throw new Error('Please provide a valid shipping address.')
}

const [order] = await connection.query(
  `INSERT INTO STORE_ORDER (
    VisitorID,
    TotalAmount,
    ShippingFirstName,
    ShippingLastName,
    ShippingAddress,
    ShippingCity,
    ShippingState,
    ShippingZip
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    req.user.VisitorID,
    totalAmount,
    shipping.firstName.trim(),
    shipping.lastName.trim(),
    shipping.address.trim(),
    shipping.city.trim(),
    shipping.state.trim(),
    shipping.zip
  ]
)

    const orderID = order.insertId

    for (const item of verifiedItems) {
      await connection.query(
        `INSERT INTO ITEM_SOLD
         (ItemID, Quantity, SoldPrice, StoreID, OrderID)
         VALUES (?, ?, ?, ?, ?)`,
        [
          item.ItemID,
          item.Quantity,
          item.Price,
          item.StoreID,
          orderID
        ]
      )

      await connection.query(
        `UPDATE STORE_ITEM
         SET StockCount = StockCount - ?
         WHERE StoreID = ? AND ItemID = ?`,
        [item.Quantity, item.StoreID, item.ItemID]
      )
    }

    await connection.commit()

    res.status(201).json({
      message: 'Purchase completed successfully.',
      OrderID: orderID,
      TotalAmount: totalAmount
    })
  } catch (error) {
    await connection.rollback()

    console.error('Store checkout error:', error.message)

    res.status(400).json({
      error: error.message || 'Failed to complete purchase.'
    })
  } finally {
    connection.release()
  }
})


app.get('/api/my-store-orders', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'VISITOR' || !req.user.VisitorID) {
      return res.status(403).json({
        error: 'A visitor account is required.'
      })
    }

    const [orders] = await db.query(
      `SELECT
          SO.OrderID,
          SO.OrderDate,
          SO.TotalAmount,
          SO.OrderStatus,
          SO.ShippingFirstName,
          SO.ShippingLastName,
          SO.ShippingAddress,
          SO.ShippingCity,
          SO.ShippingState,
          SO.ShippingZip,
          ISOLD.ItemSoldID,
          ISOLD.ItemID,
          I.Name AS ItemName,
          ISOLD.Quantity,
          ISOLD.SoldPrice,
          ISOLD.StoreID,
          S.Name AS StoreName
       FROM STORE_ORDER SO
       LEFT JOIN ITEM_SOLD ISOLD
         ON SO.OrderID = ISOLD.OrderID
       LEFT JOIN ITEM I
         ON ISOLD.ItemID = I.ItemID
       LEFT JOIN STORE S
         ON ISOLD.StoreID = S.StoreID
       WHERE SO.VisitorID = ?
       ORDER BY SO.OrderDate DESC, SO.OrderID DESC`,
      [req.user.VisitorID]
    )

    res.json(orders)
  } catch (error) {
    console.error('Store purchase history error:', error)

    res.status(500).json({
      error: 'Failed to load store purchases.'
    })
  }
})

app.get('/api/admin/store-orders', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT
        SO.OrderID,
        SO.OrderDate,
        SO.TotalAmount,
        SO.OrderStatus,
        SO.ShippingFirstName,
        SO.ShippingLastName,
        SO.ShippingAddress,
        SO.ShippingCity,
        SO.ShippingState,
        SO.ShippingZip,
        V.VisitorID,
        ISOLD.ItemSoldID,
        ISOLD.ItemID,
        I.Name AS ItemName,
        ISOLD.Quantity,
        ISOLD.SoldPrice,
        ISOLD.StoreID,
        S.Name AS StoreName
      FROM STORE_ORDER SO
      JOIN VISITOR V ON SO.VisitorID = V.VisitorID
      LEFT JOIN ITEM_SOLD ISOLD ON SO.OrderID = ISOLD.OrderID
      LEFT JOIN ITEM I ON ISOLD.ItemID = I.ItemID
      LEFT JOIN STORE S ON ISOLD.StoreID = S.StoreID
      ORDER BY SO.OrderDate DESC, SO.OrderID DESC`
    )

    res.json(orders)
  } catch (error) {
    console.error('Admin store orders error:', error)

    res.status(500).json({
      error: 'Failed to load store orders.'
    })
  }
})

app.put('/api/admin/store-orders/:orderID/status', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const orderID = Number(req.params.orderID)
    const { status } = req.body

    const allowedStatuses = [
      'Pending',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled'
    ]

    if (!Number.isInteger(orderID) || orderID <= 0) {
      return res.status(400).json({
        error: 'Invalid order ID.'
      })
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid order status.'
      })
    }

    const [result] = await db.query(
      `UPDATE STORE_ORDER
       SET OrderStatus = ?
       WHERE OrderID = ?`,
      [status, orderID]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Order not found.'
      })
    }

    res.json({
      message: 'Order status updated successfully.'
    })
  } catch (error) {
    console.error('Update store order status error:', error)

    res.status(500).json({
      error: 'Failed to update order status.'
    })
  }
})

app.delete('/api/admin/store-orders/:orderID', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { orderID } = req.params

    // Delete the purchased items associated with this order first.
    await db.query(
      'DELETE FROM ITEM_SOLD WHERE OrderID = ?',
      [orderID]
    )

    // Then delete the order.
    const [result] = await db.query(
      'DELETE FROM STORE_ORDER WHERE OrderID = ?',
      [orderID]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Order not found.'
      })
    }

    res.json({
      message: 'Order deleted successfully.'
    })
  } catch (error) {
    console.error('Delete store order error:', error)
    res.status(500).json({
      error: 'Failed to delete order.'
    })
  }
})

app.post('/api/stores/:id/items', requireAuth, requireAdminOrClerk, async (req, res) => {
  const connection = await db.getConnection()

  try {
    const storeID = Number(req.params.id)
    const name = String(req.body.Name || '').trim()
    const price = req.body.Price === '' || req.body.Price == null
      ? null
      : Number(req.body.Price)
    const stockCount = Number(req.body.StockCount)

    if (!Number.isInteger(storeID) || storeID <= 0) {
      return res.status(400).json({ error: 'Invalid store ID.' })
    }

    if (!name) {
      return res.status(400).json({ error: 'Item name is required.' })
    }

    if (price === null || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        error: 'A valid, non-negative price is required.'
      })
    }

    if (
      req.body.StockCount == null ||
      req.body.StockCount === '' ||
      !Number.isInteger(stockCount) ||
      stockCount < 0
    ) {
      return res.status(400).json({
        error: 'Stock count must be a non-negative whole number.'
      })
    }

    await connection.beginTransaction()

    const [stores] = await connection.query(
      'SELECT StoreID FROM STORE WHERE StoreID = ?',
      [storeID]
    )

    if (stores.length === 0) {
      await connection.rollback()
      return res.status(404).json({ error: 'Store not found.' })
    }

    const [nextIDs] = await connection.query(
      'SELECT COALESCE(MAX(ItemID), 0) + 1 AS nextID FROM ITEM'
    )

    const itemID = nextIDs[0].nextID

    await connection.query(
      'INSERT INTO ITEM (ItemID, Name, Price) VALUES (?, ?, ?)',
      [itemID, name, price]
    )

    await connection.query(
      'INSERT INTO STORE_ITEM (StoreID, ItemID, StockCount) VALUES (?, ?, ?)',
      [storeID, itemID, stockCount]
    )

    await connection.commit()

    res.status(201).json({
      message: 'Item created and added to store successfully.',
      ItemID: itemID
    })
  } catch (error) {
    await connection.rollback()
    console.error('Error creating store item:', error.message)
    res.status(500).json({
      error: 'Failed to create item. Please check the server logs.'
    })
  } finally {
    connection.release()
  }
})


app.put('/api/stores/:storeId/items/:itemId', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const storeID = Number(req.params.storeId)
    const itemID = Number(req.params.itemId)
    const stockCount = Number(req.body.StockCount)

    if (
      !Number.isInteger(storeID) || storeID <= 0 ||
      !Number.isInteger(itemID) || itemID <= 0 ||
      req.body.StockCount == null ||
      req.body.StockCount === '' ||
      !Number.isInteger(stockCount) || stockCount < 0
    ) {
      return res.status(400).json({
        error: 'A non-negative whole-number stock count is required.'
      })
    }

    const [result] = await db.query(
      `UPDATE STORE_ITEM
       SET StockCount = ?
       WHERE StoreID = ? AND ItemID = ?`,
      [stockCount, storeID, itemID]
    )

    if (result.affectedRows === 0) {
      const [rows] = await db.query(
        `SELECT ItemID FROM STORE_ITEM
         WHERE StoreID = ? AND ItemID = ?`,
        [storeID, itemID]
      )

      if (rows.length === 0) {
        return res.status(404).json({
          error: 'Item not found in this store.'
        })
      }
    }

    res.json({ message: 'Stock count updated.' })
  } catch (error) {
    console.error('Error updating inventory:', error.message)
    res.status(500).json({ error: 'Failed to update stock count.' })
  }
})


app.put('/api/items/:id/price', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const itemID = Number(req.params.id)
    const price = Number(req.body.Price)

    if (
      !Number.isInteger(itemID) ||
      itemID <= 0 ||
      req.body.Price == null ||
      req.body.Price === '' ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        error: 'Enter a valid, non-negative price.'
      })
    }

    const [result] = await db.query(
      'UPDATE ITEM SET Price = ? WHERE ItemID = ?',
      [price, itemID]
    )

    if (result.affectedRows === 0) {
      const [rows] = await db.query(
        'SELECT ItemID FROM ITEM WHERE ItemID = ?',
        [itemID]
      )

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Item not found.' })
      }
    }

    res.json({ message: 'Price updated successfully.' })
  } catch (error) {
    console.error('Error updating item price:', error.message)
    res.status(500).json({ error: 'Failed to update item price.' })
  }
})


app.delete('/api/stores/:storeId/items/:itemId', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const storeID = Number(req.params.storeId)
    const itemID = Number(req.params.itemId)

    if (
      !Number.isInteger(storeID) || storeID <= 0 ||
      !Number.isInteger(itemID) || itemID <= 0
    ) {
      return res.status(400).json({ error: 'Invalid store or item ID.' })
    }

    const [result] = await db.query(
      `DELETE FROM STORE_ITEM
       WHERE StoreID = ? AND ItemID = ?`,
      [storeID, itemID]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Item not found in this store.'
      })
    }

    res.json({ message: 'Item removed from this store.' })
  } catch (error) {
    console.error('Error removing inventory item:', error.message)
    res.status(500).json({ error: 'Failed to remove item from inventory.' })
  }
})

app.get('/api/items', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ITEM')
    res.json(rows)
  } catch (error) {
    console.error('Error fetching items:', error)
    res.status(500).json({ error: 'Database error' })
  }
})


app.post('/api/items', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const { Name, Price } = req.body

    if (!Name || !Name.trim()) {
      return res.status(400).json({ error: 'Item name is required' })
    }

    const price = Price === '' || Price == null ? null : Number(Price)

    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return res.status(400).json({ error: 'Price must be a non-negative number' })
    }

    const [rows] = await db.query(
      'SELECT COALESCE(MAX(ItemID), 0) + 1 AS nextID FROM ITEM'
    )

    const nextID = rows[0].nextID

    await db.query(
      'INSERT INTO ITEM (ItemID, Name, Price) VALUES (?, ?, ?)',
      [nextID, Name.trim(), price]
    )

    res.status(201).json({
      message: 'Item added successfully',
      ItemID: nextID
    })
  } catch (error) {
    console.error('Error adding item:', error)
    res.status(500).json({ error: 'Failed to add item' })
  }
})


app.put('/api/items/:id', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const itemID = Number(req.params.id)
    const { Name, Price } = req.body

    if (!Number.isInteger(itemID) || itemID <= 0) {
      return res.status(400).json({ error: 'Invalid item ID' })
    }

    if (!Name || !Name.trim()) {
      return res.status(400).json({ error: 'Item name is required' })
    }

    const price = Price === '' || Price == null ? null : Number(Price)

    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return res.status(400).json({
        error: 'Price must be a non-negative number'
      })
    }

    const [result] = await db.query(
      'UPDATE ITEM SET Name = ?, Price = ? WHERE ItemID = ?',
      [Name.trim(), price, itemID]
    )

    if (result.affectedRows === 0) {
      const [items] = await db.query(
        'SELECT ItemID FROM ITEM WHERE ItemID = ?',
        [itemID]
      )

      if (items.length === 0) {
        return res.status(404).json({ error: 'Item not found' })
      }
    }

    res.json({ message: 'Item updated successfully' })
  } catch (error) {
    console.error('Error updating item:', error)
    res.status(500).json({ error: 'Failed to update item' })
  }
})


app.delete('/api/items/:id', requireAuth, requireAdminOrClerk, async (req, res) => {
  try {
    const itemID = Number(req.params.id)

    if (!Number.isInteger(itemID) || itemID <= 0) {
      return res.status(400).json({ error: 'Invalid item ID' })
    }

    const [items] = await db.query(
      'SELECT ItemID FROM ITEM WHERE ItemID = ?',
      [itemID]
    )

    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' })
    }

    const [storeItems] = await db.query(
      'SELECT 1 FROM STORE_ITEM WHERE ItemID = ? LIMIT 1',
      [itemID]
    )

    const [sales] = await db.query(
      'SELECT 1 FROM ITEM_SOLD WHERE ItemID = ? LIMIT 1',
      [itemID]
    )

    if (storeItems.length > 0 || sales.length > 0) {
      return res.status(409).json({
        error: 'This item is assigned to a store or has sales records, so it cannot be deleted.'
      })
    }

    await db.query(
      'DELETE FROM ITEM WHERE ItemID = ?',
      [itemID]
    )

    res.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    res.status(500).json({ error: 'Failed to delete item' })
  }
})

// PDF Reports
/* app.post('/api/report/:type/:subtype', requireAuth, requireAdmin, async (req, res) => {
  const { type, subtype } = req.params;

  const reports = {
    Information: {
      Exhibitions: {
        title: 'Exhibitions',
        sql: `
          SELECT ExhibitionID, Name, Description, StartDate, EndDate,
                 ExhibitionType, GalleryID, ManagerID
          FROM EXHIBITION
          ORDER BY StartDate
        `
      },
      Memberships: {
        title: 'Memberships',
        sql: `
          SELECT m.MembershipID, m.VisitorID,
                 v.FirstName, v.LastName, m.MembershipType,
                 m.StartDate, m.EndDate, m.Price
          FROM MEMBERSHIP m
          JOIN VISITOR v ON m.VisitorID = v.VisitorID
          ORDER BY m.StartDate DESC
        `
      },
      Stores: {
        title: 'Stores',
        sql: `
          SELECT StoreID, Name, Type, Location
          FROM STORE
          ORDER BY Name
        `
      },
      Employees: {
        title: 'Employees',
        sql: `
          SELECT EmployeeID, FirstName, MiddleName, LastName,
                 Street, City, State, ZIPCode, Phone, Email,
                 Salary, Sex, BirthDate, SupervisorID
          FROM EMPLOYEE
          ORDER BY LastName, FirstName
        `
      }
    },

    Sold: {
      Tickets: {
        title: 'Ticket Sales',
        sql: `
          SELECT TicketID, Type, PurchaseDate, VisitDate,
                 Price, VisitorID, ExhibitionID, Status
          FROM TICKET
          WHERE Status = 'Active'
          ORDER BY PurchaseDate DESC
        `
      },
      ExhibitionTickets: {
        title: 'Exhibition Ticket Sales',
        sql: `
          SELECT e.ExhibitionID, e.Name,
                 COUNT(t.TicketID) AS TicketsSold,
                 COALESCE(SUM(t.Price), 0) AS TotalSales
          FROM EXHIBITION e
          LEFT JOIN TICKET t
            ON e.ExhibitionID = t.ExhibitionID
            AND t.Type = 'Single Exhibition'
            AND t.Status = 'Active'
          GROUP BY e.ExhibitionID, e.Name
          ORDER BY e.Name
        `
      },
      StoreItems: {
        title: 'Items Sold',
        sql: `
          SELECT s.ItemSoldID, i.Name AS ItemName,
                 st.Name AS StoreName, s.Quantity,
                 s.SoldPrice,
                 s.Quantity * s.SoldPrice AS TotalSales,
                 s.SaleDate
          FROM ITEM_SOLD s
          JOIN ITEM i ON s.ItemID = i.ItemID
          LEFT JOIN STORE st ON s.StoreID = st.StoreID
          ORDER BY s.SaleDate DESC
        `
      }
    },

    Profit: {
      Parking: {
        title: 'Parking Revenue',
        sql: `
          SELECT pp.ParkingPassID, pl.Name AS ParkingLot,
                 pp.VisitDate, pp.ArrivalTime, pp.DepartureTime,
                 pl.HourlyRate,
                 ROUND(
                   TIMESTAMPDIFF(
                     MINUTE, pp.ArrivalTime, pp.DepartureTime
                   ) / 60 * pl.HourlyRate, 2
                 ) AS Revenue
          FROM PARKING_PASS pp
          JOIN PARKING_LOT pl
            ON pp.ParkingLotID = pl.ParkingLotID
          WHERE pp.ArrivalTime IS NOT NULL
            AND pp.DepartureTime IS NOT NULL
            AND pp.DepartureTime >= pp.ArrivalTime
          ORDER BY pp.VisitDate DESC
        `
      },
      StoreItems: {
        title: 'Store Revenue',
        sql: `
          SELECT st.StoreID, st.Name AS StoreName,
                 COUNT(s.ItemSoldID) AS Transactions,
                 COALESCE(SUM(s.Quantity), 0) AS ItemsSold,
                 COALESCE(
                   SUM(s.Quantity * s.SoldPrice), 0
                 ) AS TotalRevenue
          FROM STORE st
          LEFT JOIN ITEM_SOLD s ON st.StoreID = s.StoreID
          GROUP BY st.StoreID, st.Name
          ORDER BY st.Name
        `
      }
    }
  };

  const report = reports[type]?.[subtype];

  if (!report) {
    return res.status(400).json({ error: 'Invalid report type.' });
  }

  try {
    const [rows] = await db.query(report.sql);
    let ticketSummary = null;

    if (type === 'Sold' && subtype === 'Tickets') {
      const [summaryRows] = await db.query(`
        SELECT
          COUNT(*) AS TicketsSold,
          COALESCE(SUM(Price), 0) AS TotalRevenue
        FROM TICKET
        WHERE Status = 'Active'
      `);

      ticketSummary = summaryRows[0];
    }

    let parkingSummary = null;

    if (type === 'Profit' && subtype === 'Parking') {
      parkingSummary = rows.reduce(
        (total, row) => total + Number(row.Revenue || 0),
        0
      );
    }

    let exhibitionTicketSummary = null;

    if (type === 'Sold' && subtype === 'ExhibitionTickets') {
      exhibitionTicketSummary = rows.reduce(
        (summary, row) => {
          summary.TicketsSold += Number(row.TicketsSold || 0);
          summary.TotalSales += Number(row.TotalSales || 0);
          return summary;
        },
        { TicketsSold: 0, TotalSales: 0 }
      );
    }

    let storeItemsSoldSummary = null;

    if (type === 'Sold' && subtype === 'StoreItems') {
      storeItemsSoldSummary = rows.reduce(
        (summary, row) => {
          summary.ItemsSold += Number(row.Quantity || 0);
          summary.TotalSales += Number(row.TotalSales || 0);
          return summary;
        },
        { ItemsSold: 0, TotalSales: 0 }
      );
    }

    let storeRevenueSummary = null;

    if (type === 'Profit' && subtype === 'StoreItems') {
      storeRevenueSummary = rows.reduce(
        (summary, row) => {
          summary.Transactions += Number(row.Transactions || 0);
          summary.ItemsSold += Number(row.ItemsSold || 0);
          summary.TotalRevenue += Number(row.TotalRevenue || 0);
          return summary;
        },
        { Transactions: 0, ItemsSold: 0, TotalRevenue: 0 }
      );
    }

    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
      layout: 'landscape'
    });

    const filename = `${type}_${subtype}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    doc.pipe(res);

    const pageWidth = doc.page.width - 80;
    const tableX = 40;
    const bottomMargin = 40;

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    // Relative column widths for each report
    const columnWeights = {
      'Information-Exhibitions': [0.06, 0.17, 0.28, 0.10, 0.10, 0.13, 0.08, 0.08],
      'Information-Memberships': [0.08, 0.08, 0.12, 0.12, 0.13, 0.12, 0.12, 0.23],
      'Information-Stores': [0.12, 0.30, 0.20, 0.38],
      'Information-Employees': [0.08, 0.12, 0.08, 0.12, 0.18, 0.10, 0.07, 0.08, 0.12, 0.12, 0.10, 0.05, 0.10, 0.08],
      'Sold-Tickets': [0.08, 0.14, 0.12, 0.12, 0.08, 0.10, 0.12, 0.10],
      'Sold-ExhibitionTickets': [0.15, 0.40, 0.20, 0.25],
      'Sold-StoreItems': [0.08, 0.20, 0.16, 0.10, 0.12, 0.14, 0.20],
      'Profit-Parking': [0.10, 0.22, 0.13, 0.13, 0.13, 0.12, 0.17],
      'Profit-StoreItems': [0.12, 0.28, 0.18, 0.14, 0.28]
    };

    const weights = columnWeights[`${type}-${subtype}`] || columns.map(() => 1 / columns.length);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    const widths = weights.map(weight => pageWidth * weight / totalWeight);

    let y;

    function drawPageHeader() {
      doc.font('Helvetica-Bold')
        .fontSize(18)
        .text(report.title, 40, 30, {
          width: pageWidth,
          align: 'center'
        });

      doc.font('Helvetica')
        .fontSize(9)
        .text(`Generated: ${new Date().toLocaleString()}`, 40, 58);

      y = 85;

      if (ticketSummary) {
        doc.font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#3b3029')
          .text(
            `Tickets Sold: ${ticketSummary.TicketsSold}    Total Revenue: $${Number(ticketSummary.TotalRevenue).toFixed(2)}`,
            tableX,
            y
          );

        y += 25;
      }

      if (parkingSummary !== null) {
        doc.font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#3b3029')
          .text(
            `Total Parking Revenue: $${parkingSummary.toFixed(2)}`,
            tableX,
            y
          );

        y += 25;
      }

      if (exhibitionTicketSummary !== null) {
        doc.font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#3b3029')
          .text(
            `Total Tickets Sold: ${exhibitionTicketSummary.TicketsSold}    Total Sales: $${exhibitionTicketSummary.TotalSales.toFixed(2)}`,
            tableX,
            y
          );

        y += 25;
      }

      if (storeItemsSoldSummary !== null) {
        doc.font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#3b3029')
          .text(
            `Total Items Sold: ${storeItemsSoldSummary.ItemsSold}    Total Sales: $${storeItemsSoldSummary.TotalSales.toFixed(2)}`,
            tableX,
            y
          );

        y += 25;
      }

      if (storeRevenueSummary !== null) {
        doc.font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#3b3029')
          .text(
            `Total Transactions: ${storeRevenueSummary.Transactions}    Total Items Sold: ${storeRevenueSummary.ItemsSold}    Total Revenue: $${storeRevenueSummary.TotalRevenue.toFixed(2)}`,
            tableX,
            y
          );

        y += 25;
      }

      if (columns.length === 0) {
        return;
      }

      doc.font('Helvetica-Bold').fontSize(8);

      let x = tableX;
      let headerHeight = 0;

      columns.forEach((column, index) => {
        const height = doc.heightOfString(column, {
          width: widths[index] - 10
        });

        headerHeight = Math.max(headerHeight, height);
      });

      headerHeight += 12;

      doc.rect(tableX, y, pageWidth, headerHeight)
        .fill('#e8ded3');

      columns.forEach((column, index) => {
        doc.fillColor('#3b3029')
          .text(column, x + 5, y + 6, {
            width: widths[index] - 10,
            height: headerHeight - 10
          });

        x += widths[index];
      });

      y += headerHeight;
      doc.font('Helvetica').fontSize(8);
    }

    if (rows.length === 0) {
      drawPageHeader();
      doc.fontSize(11).text('No records found.', 40, y + 15);
    } else {
      drawPageHeader();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const values = columns.map(column => {
          const value = row[column];

          if (value instanceof Date) {
            return value.toISOString().split('T')[0];
          }

          return value === null || value === undefined
            ? ''
            : String(value);
        });

        // Calculate the height needed by this row
        let rowHeight = 0;

        values.forEach((value, index) => {
          const height = doc.heightOfString(value, {
            width: widths[index] - 10,
            lineGap: 2
          });

          rowHeight = Math.max(rowHeight, height);
        });

        rowHeight += 12;

        // Start a new page if the row does not fit
        if (y + rowHeight > doc.page.height - bottomMargin) {
          doc.addPage();
          drawPageHeader();
        }

        // Alternate row backgrounds
        if (i % 2 === 0) {
          doc.rect(tableX, y, pageWidth, rowHeight)
            .fill('#f7f3ef');
        }

        // Draw row text
        let x = tableX;

        values.forEach((value, index) => {
          doc.fillColor('#333333')
            .font('Helvetica')
            .fontSize(8)
            .text(value, x + 5, y + 6, {
              width: widths[index] - 10,
              lineGap: 2
            });

          x += widths[index];
        });

        // Draw a separator
        doc.moveTo(tableX, y + rowHeight)
          .lineTo(tableX + pageWidth, y + rowHeight)
          .strokeColor('#dddddd')
          .stroke();

        y += rowHeight;
      }
    }

    doc.end();
  } catch (error) {
    console.error('Report generation error:', error);

    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate report.' });
    } else {
      res.destroy(error);
    }
  }
}); */


async function getFinancialReport(startDate, endDate) {

    // 1. Ticket sales
    const [tickets] = await db.execute(`
        SELECT
            T.TicketID,
            T.Type AS TicketType,
            T.PurchaseDate,
            T.VisitDate,
            T.Price,
            T.Status,
            V.FirstName,
            V.LastName,
            E.Name AS Exhibition
        FROM TICKET T
        JOIN VISITOR V ON T.VisitorID = V.VisitorID
        LEFT JOIN EXHIBITION E ON T.ExhibitionID = E.ExhibitionID
        WHERE T.PurchaseDate >= ?
          AND T.PurchaseDate < DATE_ADD(?, INTERVAL 1 DAY)
          AND T.Status = 'Active'
        ORDER BY T.PurchaseDate DESC
    `, [startDate, endDate]);

    const [[ticketSummary]] = await db.execute(`
        SELECT
            COUNT(*) AS TicketsSold,
            COALESCE(SUM(Price), 0) AS TotalRevenue
        FROM TICKET
        WHERE PurchaseDate >= ?
          AND PurchaseDate < DATE_ADD(?, INTERVAL 1 DAY)
          AND Status = 'Active'
    `, [startDate, endDate]);


    // 2. Membership sales
    const [memberships] = await db.execute(`
        SELECT
            M.MembershipID,
            V.FirstName,
            V.LastName,
            M.MembershipType,
            M.StartDate,
            M.EndDate,
            COALESCE(M.Price, MT.Price, 0) AS PaidPrice
        FROM MEMBERSHIP M
        JOIN VISITOR V ON M.VisitorID = V.VisitorID
        LEFT JOIN MEMBERSHIP_TYPE MT
            ON M.MembershipType = MT.MembershipType
        WHERE M.StartDate >= ?
          AND M.StartDate < DATE_ADD(?, INTERVAL 1 DAY)
        ORDER BY M.StartDate DESC
    `, [startDate, endDate]);

    const [[membershipSummary]] = await db.execute(`
        SELECT
            COUNT(*) AS MembershipsSold,
            COALESCE(SUM(COALESCE(M.Price, MT.Price, 0)), 0)
                AS TotalRevenue
        FROM MEMBERSHIP M
        LEFT JOIN MEMBERSHIP_TYPE MT
            ON M.MembershipType = MT.MembershipType
        WHERE M.StartDate >= ?
          AND M.StartDate < DATE_ADD(?, INTERVAL 1 DAY)
    `, [startDate, endDate]);


    // 3. Store sales
    const [storeItems] = await db.execute(`
        SELECT
            ISold.ItemSoldID,
            I.Name AS ItemName,
            S.Name AS StoreName,
            ISold.Quantity,
            ISold.SoldPrice,
            ISold.SaleDate,
            (ISold.Quantity * ISold.SoldPrice) AS Total
        FROM ITEM_SOLD ISold
        JOIN ITEM I ON ISold.ItemID = I.ItemID
        LEFT JOIN STORE S ON ISold.StoreID = S.StoreID
        WHERE ISold.SaleDate >= ?
          AND ISold.SaleDate < DATE_ADD(?, INTERVAL 1 DAY)
        ORDER BY ISold.SaleDate DESC
    `, [startDate, endDate]);

    const [[storeRevenueSummary]] = await db.execute(`
        SELECT
            COUNT(*) AS Transactions,
            COALESCE(SUM(Quantity), 0) AS ItemsSold,
            COALESCE(SUM(Quantity * SoldPrice), 0) AS TotalRevenue
        FROM ITEM_SOLD
        WHERE SaleDate >= ?
          AND SaleDate < DATE_ADD(?, INTERVAL 1 DAY)
    `, [startDate, endDate]);


    // 4. Parking sales
    const [parking] = await db.execute(`
        SELECT
            PP.ParkingPassID,
            V.FirstName,
            V.LastName,
            PL.Name AS ParkingLot,
            PP.VisitDate,
            PP.ArrivalTime,
            PP.DepartureTime,
            PP.TotalPrice
        FROM PARKING_PASS PP
        JOIN VISITOR V ON PP.VisitorID = V.VisitorID
        JOIN PARKING_LOT PL ON PP.ParkingLotID = PL.ParkingLotID
        WHERE PP.VisitDate >= ?
          AND PP.VisitDate < DATE_ADD(?, INTERVAL 1 DAY)
        ORDER BY PP.VisitDate DESC
    `, [startDate, endDate]);

    const [[parkingSummary]] = await db.execute(`
        SELECT
            COUNT(*) AS PassesSold,
            COALESCE(SUM(TotalPrice), 0) AS TotalRevenue
        FROM PARKING_PASS
        WHERE VisitDate >= ?
          AND VisitDate < DATE_ADD(?, INTERVAL 1 DAY)
    `, [startDate, endDate]);


    // 5. Calculate combined revenue
    const totalRevenue =
        Number(ticketSummary.TotalRevenue) +
        Number(membershipSummary.TotalRevenue) +
        Number(storeRevenueSummary.TotalRevenue) +
        Number(parkingSummary.TotalRevenue);


    // 6. Return the report
    return {
        title: 'Financial Performance Report',

        sections: [
            {
                title: 'Overall Revenue',
                rows: [{
                    TicketRevenue: Number(ticketSummary.TotalRevenue),
                    MembershipRevenue: Number(membershipSummary.TotalRevenue),
                    StoreRevenue: Number(storeRevenueSummary.TotalRevenue),
                    ParkingRevenue: Number(parkingSummary.TotalRevenue),
                    CombinedRevenue: totalRevenue
                }]
            },
            {
                title: 'Ticket Sales',
                rows: tickets,
                summary:
                    `Tickets Sold: ${ticketSummary.TicketsSold} | ` +
                    `Revenue: $${Number(ticketSummary.TotalRevenue).toFixed(2)}`
            },
            {
                title: 'Membership Sales',
                rows: memberships,
                summary:
                    `Memberships Sold: ${membershipSummary.MembershipsSold} | ` +
                    `Revenue: $${Number(membershipSummary.TotalRevenue).toFixed(2)}`
            },
            {
                title: 'Store Sales',
                rows: storeItems,
                summary:
                    `Sale Records: ${storeRevenueSummary.Transactions} | ` +
                    `Items Sold: ${storeRevenueSummary.ItemsSold} | ` +
                    `Revenue: $${Number(storeRevenueSummary.TotalRevenue).toFixed(2)}`
            },
            {
                title: 'Parking Revenue',
                rows: parking,
                summary:
                    `Passes Sold: ${parkingSummary.PassesSold} | ` +
                    `Revenue: $${Number(parkingSummary.TotalRevenue).toFixed(2)}`
            }
        ]
    };
}


async function getExhibitionReport(startDate, endDate) {

    // 1. Exhibition information
    const [exhibitions] = await db.execute(`
        SELECT
            E.ExhibitionID,
            E.Name AS ExhibitionName,
            E.ExhibitionType,
            E.StartDate,
            E.EndDate,
            G.Name AS GalleryName,
            G.Location AS GalleryLocation,
            CONCAT(M.FirstName, ' ', M.LastName) AS ManagerName,
            (
                SELECT COUNT(*)
                FROM EXHIBITION_ARTWORK EA
                WHERE EA.ExhibitionID = E.ExhibitionID
            ) AS ArtworkCount
        FROM EXHIBITION E
        LEFT JOIN GALLERY G ON E.GalleryID = G.GalleryID
        LEFT JOIN EMPLOYEE M ON E.ManagerID = M.EmployeeID
        WHERE E.StartDate <= ?
          AND (E.EndDate IS NULL OR E.EndDate >= ?)
        ORDER BY E.StartDate
    `, [endDate, startDate]);


    // 2. Exhibition ticket sales and attendance
    const [exhibitionTickets] = await db.execute(`
        SELECT
            E.ExhibitionID,
            E.Name AS ExhibitionName,
            G.Name AS GalleryName,
            COUNT(T.TicketID) AS TicketsSold,
            COUNT(DISTINCT T.VisitorID) AS UniqueVisitors,
            COALESCE(SUM(T.Price), 0) AS TotalRevenue
        FROM EXHIBITION E
        LEFT JOIN GALLERY G ON E.GalleryID = G.GalleryID
        LEFT JOIN TICKET T
            ON E.ExhibitionID = T.ExhibitionID
            AND T.VisitDate >= ?
            AND T.VisitDate < DATE_ADD(?, INTERVAL 1 DAY)
            AND T.Status = 'Active'
        WHERE E.StartDate <= ?
          AND (E.EndDate IS NULL OR E.EndDate >= ?)
        GROUP BY E.ExhibitionID, E.Name, G.Name
        ORDER BY TicketsSold DESC
    `, [startDate, endDate, endDate, startDate]);

    const [[exhibitionTicketSummary]] = await db.execute(`
        SELECT
            COUNT(*) AS TicketsSold,
            COALESCE(SUM(Price), 0) AS TotalSales
        FROM TICKET
        WHERE ExhibitionID IS NOT NULL
          AND VisitDate >= ?
          AND VisitDate < DATE_ADD(?, INTERVAL 1 DAY)
          AND Status = 'Active'
    `, [startDate, endDate]);


    // 3. Artwork associated with exhibitions
    const [exhibitionArtwork] = await db.execute(`
        SELECT
            E.ExhibitionID,
            E.Name AS ExhibitionName,
            A.ArtworkID,
            A.Name AS ArtworkName,
            A.Type AS ArtworkType,
            A.Origin,
            A.CreationDate
        FROM EXHIBITION_ARTWORK EA
        JOIN EXHIBITION E
            ON EA.ExhibitionID = E.ExhibitionID
        JOIN ARTWORK A
            ON EA.ArtworkID = A.ArtworkID
        WHERE E.StartDate <= ?
          AND (E.EndDate IS NULL OR E.EndDate >= ?)
        ORDER BY E.Name, A.Name
    `, [endDate, startDate]);


    // 4. Return the report
    return {
        title: 'Exhibition Performance Report',

        sections: [
            {
                title: 'Exhibition Information',
                rows: exhibitions
            },
            {
                title: 'Exhibition Ticket Sales',
                rows: exhibitionTickets,
                summary:
                    `Total Exhibition Tickets: ${exhibitionTicketSummary.TicketsSold} | ` +
                    `Total Sales: $${Number(exhibitionTicketSummary.TotalSales).toFixed(2)}`
            },
            {
                title: 'Artwork Associated With Exhibitions',
                rows: exhibitionArtwork
            }
        ]
    };
}


async function getOperationsReport(startDate, endDate) {

    // 1. Visitor activity
    const [visitors] = await db.execute(`
        SELECT
            V.VisitorID,
            V.FirstName,
            V.LastName,
            V.Email,
            COALESCE(T.TicketCount, 0) AS TicketsPurchased,
            COALESCE(T.VisitDays, 0) AS VisitDays,
            COALESCE(M.MembershipCount, 0) AS MembershipCount,
            COALESCE(P.ParkingPassCount, 0) AS ParkingPassCount
        FROM VISITOR V

        LEFT JOIN (
            SELECT
                VisitorID,
                COUNT(*) AS TicketCount,
                COUNT(DISTINCT VisitDate) AS VisitDays
            FROM TICKET
            WHERE VisitDate >= ?
              AND VisitDate < DATE_ADD(?, INTERVAL 1 DAY)
              AND Status = 'Active'
            GROUP BY VisitorID
        ) T ON V.VisitorID = T.VisitorID

        LEFT JOIN (
            SELECT
                VisitorID,
                COUNT(*) AS MembershipCount
            FROM MEMBERSHIP
            WHERE StartDate >= ?
              AND StartDate < DATE_ADD(?, INTERVAL 1 DAY)
            GROUP BY VisitorID
        ) M ON V.VisitorID = M.VisitorID

        LEFT JOIN (
            SELECT
                VisitorID,
                COUNT(*) AS ParkingPassCount
            FROM PARKING_PASS
            WHERE VisitDate >= ?
              AND VisitDate < DATE_ADD(?, INTERVAL 1 DAY)
            GROUP BY VisitorID
        ) P ON V.VisitorID = P.VisitorID

        WHERE T.VisitorID IS NOT NULL
           OR M.VisitorID IS NOT NULL
           OR P.VisitorID IS NOT NULL

        ORDER BY V.LastName, V.FirstName
    `, [
        startDate, endDate,
        startDate, endDate,
        startDate, endDate
    ]);


    // 2. Membership activity
    const [memberships] = await db.execute(`
        SELECT
            M.MembershipID,
            V.FirstName,
            V.LastName,
            M.MembershipType,
            MT.Price AS StandardPrice,
            M.Price AS PaidPrice,
            M.StartDate,
            M.EndDate
        FROM MEMBERSHIP M
        JOIN VISITOR V ON M.VisitorID = V.VisitorID
        LEFT JOIN MEMBERSHIP_TYPE MT
            ON M.MembershipType = MT.MembershipType
        WHERE M.StartDate >= ?
          AND M.StartDate < DATE_ADD(?, INTERVAL 1 DAY)
        ORDER BY M.StartDate DESC
    `, [startDate, endDate]);


    // 3. Employee and role information
    const [employees] = await db.execute(`
        SELECT
            E.EmployeeID,
            E.FirstName,
            E.LastName,
            E.Email,
            E.Phone,
            E.Salary,
            R.RoleID,
            R.Name AS RoleName,
            ER.StartDate AS RoleStartDate,
            ER.EndDate AS RoleEndDate
        FROM EMPLOYEE E
        JOIN EMPLOYEE_ROLE ER
            ON E.EmployeeID = ER.EmployeeID
        JOIN ROLE R
            ON ER.RoleID = R.RoleID
        WHERE ER.StartDate <= ?
          AND (ER.EndDate IS NULL OR ER.EndDate >= ?)
        ORDER BY R.Name, E.LastName
    `, [endDate, startDate]);


    // 4. Return the report
    return {
        title: 'Visitor and Staff Operations Report',

        sections: [
            {
                title: 'Visitor Activity',
                rows: visitors,
                summary: `Visitors With Recorded Activity: ${visitors.length}`
            },
            {
                title: 'Membership Activity',
                rows: memberships,
                summary: `Memberships Started: ${memberships.length}`
            },
            {
                title: 'Employee and Role Information',
                rows: employees,
                summary: `Employee Role Assignments: ${employees.length}`
            }
        ]
    };
}


function generateReportPDF(res, type, report) {
    const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        layout: 'landscape'
    });

    const filename = `${type}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
    );

    doc.pipe(res);

    const pageWidth = doc.page.width - 80;
    const tableX = 40;
    const bottomMargin = 40;

    let y = 85;

    // Each report contains its own tables and summaries.
    function drawTable(title, rows, summary = null) {
        rows = rows || [];

        doc.font('Helvetica-Bold')
            .fontSize(13)
            .fillColor('#3b3029')
            .text(title, tableX, y);

        y += 23;

        if (summary) {
            doc.font('Helvetica-Bold')
                .fontSize(9)
                .text(summary, tableX, y);

            y += 20;
        }

        if (rows.length === 0) {
            doc.font('Helvetica')
                .fontSize(9)
                .text('No records found.', tableX, y);

            y += 25;
            return;
        }

        const columns = Object.keys(rows[0]);

        const weights = columns.map(() => 1);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const widths = weights.map(
            weight => pageWidth * weight / totalWeight
        );

        function drawHeader() {
            let x = tableX;
            let headerHeight = 0;

            doc.font('Helvetica-Bold').fontSize(8);

            columns.forEach((column, index) => {
                const height = doc.heightOfString(String(column), {
                    width: widths[index] - 10
                });

                headerHeight = Math.max(headerHeight, height);
            });

            headerHeight += 12;

            doc.rect(tableX, y, pageWidth, headerHeight)
                .fill('#e8ded3');

            columns.forEach((column, index) => {
                doc.fillColor('#3b3029')
                    .text(String(column), x + 5, y + 6, {
                        width: widths[index] - 10,
                        height: headerHeight - 10
                    });

                x += widths[index];
            });

            y += headerHeight;
        }

        if (y + 40 > doc.page.height - bottomMargin) {
            doc.addPage();
            y = 40;
        }

        drawHeader();

        rows.forEach((row, rowIndex) => {
            const values = columns.map(column => {
                const value = row[column];

                if (value instanceof Date) {
                    return value.toISOString().split('T')[0];
                }

                return value === null || value === undefined
                    ? ''
                    : String(value);
            });

            let rowHeight = 0;

            values.forEach((value, index) => {
                const height = doc.heightOfString(value, {
                    width: widths[index] - 10,
                    lineGap: 2
                });

                rowHeight = Math.max(rowHeight, height);
            });

            rowHeight += 12;

            if (y + rowHeight > doc.page.height - bottomMargin) {
                doc.addPage();
                y = 40;
                drawHeader();
            }

            if (rowIndex % 2 === 0) {
                doc.rect(tableX, y, pageWidth, rowHeight)
                    .fill('#f7f3ef');
            }

            let x = tableX;

            values.forEach((value, index) => {
                doc.fillColor('#333333')
                    .font('Helvetica')
                    .fontSize(8)
                    .text(value, x + 5, y + 6, {
                        width: widths[index] - 10,
                        lineGap: 2
                    });

                x += widths[index];
            });

            doc.moveTo(tableX, y + rowHeight)
                .lineTo(tableX + pageWidth, y + rowHeight)
                .strokeColor('#dddddd')
                .stroke();

            y += rowHeight;
        });

        y += 25;
    }

    // Report title and date range
    doc.font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#3b3029')
        .text(report.title, tableX, 30, {
            width: pageWidth,
            align: 'center'
        });

    doc.font('Helvetica')
        .fontSize(9)
        .text(`Generated: ${new Date().toLocaleString()}`, tableX, 58);

    doc.text(
        `Date Range: ${report.startDate} to ${report.endDate}`,
        tableX,
        72
    );

    // Draw each table belonging to this report
    report.sections.forEach(section => {
        drawTable(
            section.title,
            section.rows,
            section.summary
        );
    });

    doc.end();
}

app.post('/api/report/:type', requireAuth, requireAdmin, async (req, res) => {
    const { type } = req.params;
    const { startDate, endDate } = req.body;

    try {
        if (!['Financial', 'Exhibitions', 'Operations'].includes(type)) {
            return res.status(400).json({
                error: 'Invalid report type'
            });
        }

        if (!startDate || !endDate || startDate > endDate) {
            return res.status(400).json({
                error: 'Invalid date range'
            });
        }

        let reportData;

        switch (type) {
            case 'Financial':
                reportData = await getFinancialReport(startDate, endDate);
                break;

            case 'Exhibitions':
                reportData = await getExhibitionReport(startDate, endDate);
                break;

            case 'Operations':
                reportData = await getOperationsReport(startDate, endDate);
                break;
        }

        generateReportPDF(res, type, {
            ...reportData,
            startDate,
            endDate
        });

    } catch (error) {
        console.error('Report generation error:', error);

        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to generate report'
            });
        }
    }
});

// Start the server
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}
module.exports = app;