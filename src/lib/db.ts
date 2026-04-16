import mysql from "mysql2/promise";


export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT) || 3306, 
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función de prueba para el page.tsx
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conexión exitosa al servidor ERP (84.46.245.240)");
    connection.release();
    return true;
  } catch (error) {
    console.error("❌ Error de conexión:", error);
    return false;
  }
}