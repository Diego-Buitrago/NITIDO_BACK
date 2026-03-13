import { Pool, PoolConfig, types } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configurar pg para parsear NUMERIC/DECIMAL como números en lugar de strings
// OID 1700 es el tipo NUMERIC en PostgreSQL
types.setTypeParser(1700, (val: string) => parseFloat(val));

const config: PoolConfig = {
  user: process.env.DB_USER || "",
  host: process.env.DB_HOST || "",
  database: process.env.DB_DATABASE || "",
  password: process.env.DB_PASSWORD || "",
  port: +process.env.DB_PORT || 5432,
  max: 20, // Número máximo de conexiones en el pool
  // idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 10000, // Tiempo extra para que Neon encienda (wakeup)
  ssl: {
    rejectUnauthorized: false, // 🔥 obligatorio en Neon
  },
}

// if (process.env.DB_HOST !== 'localhost') {
//   config["ssl"] = {
//       rejectUnauthorized: false
//   }
// }

const pool = new Pool(config);

pool.on('connect', () => {
  console.log('Connected to the database');
});

pool.on('error', (err) => {
  console.error('Error connecting to the database', err);
});

export { pool }
// export const query = (text: string, params?: any[]) => pool.query(text, params);