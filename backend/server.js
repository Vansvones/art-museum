import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

// Get all artworks
app.get("/api/artworks", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM ARTWORK");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get all artists
app.get("/api/artists", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM ARTIST");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get all visitors
app.get("/api/visitors", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM VISITOR");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get all employees
app.get("/api/employees", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM EMPLOYEE");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get all stores
app.get("/api/stores", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM STORE");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get all items
app.get("/api/items", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM ITEM");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get all user accounts (without password hashes)
app.get("/api/accounts", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        UserID,
        VisitorID,
        Email,
        AccountRole,
        CreatedAt
      FROM USER_ACCOUNT
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});