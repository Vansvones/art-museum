import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "mysql-1f2f71cb-denis.f.aivencloud.com",
  port: 28332,
  user: "museum_teammate",
  password: "teammate_password345",
  database: "defaultdb",
  ssl: {
  rejectUnauthorized: false
}
});

export default pool;