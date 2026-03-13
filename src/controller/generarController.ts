import { Request, Response } from 'express';
import { pool } from '../db/connection';
import jwt from "jsonwebtoken";
import { GeneralList } from '../interfaces/general';

type ResponseSection = | { token: string, profile: number } | { message: string };

export const validateToken = async (req: Request, res: Response<ResponseSection>) => {
    const authorization = req.get("Authorization");
    let token = "";

    // Obtener una conexión del pool
  const client = await pool.connect();
  
    try {
        if (authorization && authorization.toLowerCase().startsWith("bearer")) {
            token = authorization.substring(7);
        }

        if (!token) {
            return res.status(401).json({ message: 'Autentificación Invalida' });
        }
    
        const { userId, email } = jwt.verify(token, process.env.JWT_SECRET) as { userId: number, email: string };


        if (!userId || !email) {
            return res.status(401).json({ message: 'Autentificación Invalida' });
        }
    
        const {rows} = await client.query(`SELECT fk_profile_id FROM auth.users WHERE user_id = $1 AND email = $2 AND fk_status_id = 1 LIMIT 1`, [userId, email]);

        if (!(rows.length > 0)) return res.status(401).json({ message: 'Autentificación Invalida' });    

        res.status(200).json({ token, profile: rows[0].fk_profile_id });
    } catch (error) {
        console.log(error);
        res.status(401).json({ message: 'Autentificación Invalida' });
    } finally {
      if (client) client.release();
    }
};

export const getProfiles = async (_req: Request, res: Response<GeneralList[] | { message: string }>) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`SELECT profile_id id, name FROM auth.profiles WHERE fk_status_id = 1 ORDER BY name ASC`);
        res.status(200).json(rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
      if (client) client.release();
    }
};

export const getTypePayments = async (_req: Request, res: Response<GeneralList[] | { message: string }>) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`SELECT type_payment_id id, name FROM admin.types_payment WHERE fk_status_id = 1 ORDER BY name ASC`);
        res.status(200).json(rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
      if (client) client.release();
    }
};

export const getReceiptStates = async (_req: Request, res: Response<GeneralList[] | { message: string }>) => {
    const client = await pool.connect();
    try {
        const { rows } = await client.query(`SELECT rec_state_id id, name FROM sales.receipt_states WHERE rec_state_id != 3`);
        res.status(200).json(rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
      if (client) client.release();
    }
};
