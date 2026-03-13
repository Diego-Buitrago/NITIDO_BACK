import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import generalRoutes from './routes/generalRoutes';
import usersRoutes from './routes/usersRoutes';
import customersRoutes from './routes/customersRoutes';
import productsRoutes from './routes/productsRoutes';
import receiptsRoutes from './routes/receiptsRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configurar CORS
const allowedOrigins = [
  'http://localhost:5173', 
  'http://127.0.0.1:5173',
  'https://receipts-nitido.vercel.app' // Cambia esto por tu dominio real de producción
];
app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como las que vienen de herramientas como Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
}));

// Usar Morgan para registrar solicitudes
app.use(morgan('dev'));

app.use(express.json());

// Rutas
app.use(generalRoutes);
app.use(usersRoutes);
app.use(customersRoutes);
app.use(productsRoutes);
app.use(receiptsRoutes);

// Middleware para manejar rutas no encontradas (404)
app.use(notFoundHandler);

// Middleware de manejo de errores general
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

export default app;

