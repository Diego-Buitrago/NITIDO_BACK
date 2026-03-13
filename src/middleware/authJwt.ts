import { pool } from '../db/connection';
import jwt from "jsonwebtoken";
import { Response,  NextFunction } from 'express';
import { AuthenticatedRequest } from '../interfaces/general';

type ResponseSection = { message: string };
type typeDecoded = { userId: number, email: string };

export const verifyToken = async (req: AuthenticatedRequest, res: Response<ResponseSection>, next: NextFunction) => {
  try {
    const authorization = req.get("Authorization");
    let token = "";

    if (authorization && authorization.toLowerCase().startsWith("bearer")) {
      token = authorization.substring(7);
    }

    if (!token) {
      return res.status(401).json({ message: 'Autentificación Invalida' });
    }

    jwt.verify(token, process.env.JWT_SECRET as string, async (err: any, decoded: any) => {
      if (err) {
        console.log(err);
        return res.status(401).json({ message: "Autorización invalida" });
      } 
      
      try {
        const payload = decoded as typeDecoded;
        const { userId, email } = payload;

        const { rows } = await pool.query(
          `SELECT CONCAT(name, ' ', last_name) name FROM auth.users WHERE user_id = $1 AND email = $2 AND fk_status_id = 1 LIMIT 1`, 
          [userId, email]
        );

        if (!(rows.length > 0)) {
          return res.status(401).json({ message: "Autorización invalida" });
        }

        req.user = { userId: userId, userName: rows[0].name };
        
        next();       
      } catch (dbError) {
        console.log(dbError);
        return res.status(500).json({ message: "Error interno del servidor" });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};
