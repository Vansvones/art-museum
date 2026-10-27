require('dotenv').config({ path: '../../.env' });

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173',
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
app.get('/api/check-artwork-columns', async (req, res) => {
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
app.post('/api/artists', requireAuth, requireAdmin, async (req, res) => {
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
app.put('/api/artists/:id', requireAuth, requireAdmin, async (req, res) => {
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
app.delete('/api/artists/:id', requireAuth, requireAdmin, async (req, res) => {
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
  requireAdmin,
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
  requireAdmin,
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
app.post('/api/exhibitions', requireAuth, requireAdmin, async (req, res) => {
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
    console.error('Error adding exhibition:', error.message);
    res.status(500).json({ error: 'Failed to add exhibition' });
  }
});

// Update an exhibition
app.put('/api/exhibitions/:id', requireAuth, requireAdmin, async (req, res) => {
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
    console.error('Error updating exhibition:', error.message);
    res.status(500).json({ error: 'Failed to update exhibition' });
  }
});

// Delete an exhibition
app.delete('/api/exhibitions/:id', requireAuth, requireAdmin, async (req, res) => {
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
app.post('/api/artworks', requireAuth, requireAdmin, async (req, res) => {
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
app.put('/api/artworks/:id', requireAuth, requireAdmin, async (req, res) => {
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
app.delete('/api/artworks/:id', requireAuth, requireAdmin, async (req, res) => {
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

    const [accounts] = await db.query(
      'SELECT 1 FROM USER_ACCOUNT WHERE VisitorID = ? LIMIT 1',
      [visitorID]
    );

    if (
      tickets.length > 0 ||
      memberships.length > 0 ||
      accounts.length > 0
    ) {
      return res.status(409).json({
        error: 'This visitor has tickets, memberships, or an account and cannot be deleted.'
      });
    }

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
app.get('/api/employees', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM EMPLOYEE ORDER BY EmployeeID'
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching employees:', error.message)
    res.status(500).json({ error: 'Failed to fetch employees' })
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
app.get('/api/tickets', async (req, res) => {
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
app.get('/api/ticket-options/visitors', async (req, res) => {
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
app.post('/api/tickets', requireAuth, requireAdmin, async (req, res) => {
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
    console.error('Error adding ticket:', error.message)
    res.status(500).json({
      error: 'Failed to add ticket. Check the ticket ID and related records.'
    })
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
    console.error('Ticket purchase failed:', error.message);
    res.status(500).json({
      error: 'Could not complete the ticket purchase.'
    });
  } finally {
    connection.release();
  }
});


// Update a ticket
app.put('/api/tickets/:id', requireAuth, requireAdmin, async (req, res) => {
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
    console.error('Error updating ticket:', error.message)
    res.status(500).json({
      error: 'Failed to update ticket. Check the related records.'
    })
  }
})

// Delete a ticket
app.delete('/api/tickets/:id', requireAuth, requireAdmin, async (req, res) => {
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
app.post('/api/stores', requireAuth, requireAdmin, async (req, res) => {
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
app.put('/api/stores/:id', requireAuth, requireAdmin, async (req, res) => {
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
app.delete('/api/stores/:id', requireAuth, requireAdmin, async (req, res) => {
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



app.post('/api/stores/:id/items', requireAuth, requireAdmin, async (req, res) => {
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


app.put('/api/stores/:storeId/items/:itemId', requireAuth, requireAdmin, async (req, res) => {
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


app.put('/api/items/:id/price', requireAuth, requireAdmin, async (req, res) => {
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


app.delete('/api/stores/:storeId/items/:itemId', requireAuth, requireAdmin, async (req, res) => {
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


app.post('/api/items', async (req, res) => {
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


app.put('/api/items/:id', async (req, res) => {
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


app.delete('/api/items/:id', async (req, res) => {
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
