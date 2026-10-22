
require('dotenv').config();

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  let db;

  try {
    const email = (await ask('Admin email: ')).trim().toLowerCase();
    const password = await ask('Choose admin password: ');

    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    if (password.length < 12) {
      throw new Error('Use a password with at least 12 characters.');
    }

    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    const [existing] = await db.execute(
      'SELECT UserID FROM USER_ACCOUNT WHERE Email = ?',
      [email]
    );

    if (existing.length > 0) {
      throw new Error('An account with that email already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.execute(
      `INSERT INTO USER_ACCOUNT
       (VisitorID, Email, PasswordHash, AccountRole)
       VALUES (NULL, ?, ?, 'ADMIN')`,
      [email, passwordHash]
    );

    console.log('Admin account created successfully.');
  } catch (error) {
    console.error('Could not create admin:', error.message);
    process.exitCode = 1;
  } finally {
    if (db) await db.end();
    rl.close();
  }
}

main();
