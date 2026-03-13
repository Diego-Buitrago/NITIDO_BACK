import { Request, Response } from 'express';
import { pool } from '../db/connection';
import jwt from "jsonwebtoken";
import { comparePassword, getUserContext, hashPassword } from '../utils/utils';
import { ResponseList, ResponseSection, UserForm, UsersFilters } from '../interfaces/users';
import { AuthenticatedRequest, Pagination, GeneralResponse } from '../interfaces/general';


export const startSection = async (req: Request, res: Response<ResponseSection>) => {
    const { user, password } = req.body as { user: string, password: string };

    const client = await pool.connect();

    try {
        const { rows } = await client.query(`SELECT user_id "userId", password clave, CONCAT(name, ' ', COALESCE(last_name, '')) name, email, fk_profile_id profile FROM auth.users WHERE (email = $1 OR username = $2) AND fk_status_id = 1 LIMIT 1`, [ user, user ]);
        
        // Si no se encuentra el usuario, devolver un mensaje de error
        if (rows.length === 0) {
            return res.status(403).json({ message: "Correo electrónico o contraseña incorrectos" }); 
        }

        // Verificar la contraseña
        const matchPassword = await comparePassword(password, rows[0].clave);   
        
        if (!matchPassword)  {
            return res.status(400).json({ message: "Correo electrónico o contraseña incorrectos" }); 
        }

        // Crear token JWT
        const { userId, name, email, profile } = rows[0];
        const userToken = { userId, name, email };

        const token = jwt.sign(userToken, process.env.JWT_SECRET, { expiresIn: 60 * 60 * 24 }); // expiresIn 24 HORAS 

        // Devolver información del usuario y token
        return res.status(200).json({ token, profile });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
      if (client) client.release();
    }
};

export const listUsers = async (req: Request, res: Response<ResponseList>) => {
    const { limit, offset, sortField, sortOrder, name, lastName, email, profile, state } = req.body as Pagination & UsersFilters;

    const order = sortOrder === 1 ? "ASC" : "DESC";

    const whereConditions = ["u.fk_status_id != 3"];
    const queryParams = [];
    let paramIndex = 1;

    if (name) {
        whereConditions.push(`LOWER(u.name) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${name}%`);
        paramIndex++;
    }

    if (lastName) {
        whereConditions.push(`LOWER(u.last_name) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${lastName}%`);
        paramIndex++;   
    }

    if (email) {
        whereConditions.push(`LOWER(u.email) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${email}%`);
        paramIndex++;   
    }

    if (profile) {
        whereConditions.push(`u.fk_profile_id = $${paramIndex}`);
        queryParams.push(profile);
        paramIndex++;
    }

    if (state) {
        whereConditions.push(`u.fk_status_id = $${paramIndex}`);
        queryParams.push(state);
        paramIndex++;
    }

    // Construct the WHERE clause
    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    // Mapeo solo de alias (campos con "")
    const sortFieldMap: Record<string, string> = {
        lastName: "u.last_name",
        profile: "p.name",
        state: "s.name"
    };

    const sortColumn = sortFieldMap[sortField] || `u.${sortField}`;

    // Obtener una conexión del pool
    const client = await pool.connect();

    try {
        const from = "FROM auth.users u JOIN auth.profiles p ON u.fk_profile_id = p.profile_id JOIN admin.status s ON u.fk_status_id = s.status_id";      

        const { rows } = await client.query(`SELECT u.user_id "userId", u.fk_profile_id "profileId", u.name name, u.last_name "lastName", u.email email, u.username username, p.name profile, s.name state, u.fk_status_id "stateId" ${from} ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...queryParams, limit, offset]);     
        
        const { rows: rowCount } = await client.query(`SELECT COUNT(DISTINCT u.user_id) total ${from} ${whereClause}`, queryParams);    
   
        return res.status(200).json({ results: rows, total: +rowCount[0].total });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
      if (client) client.release();
    }
};

export const createUser = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const { profileId, name, lastName, email, username, password, stateId } = req.body as UserForm;    

    const userContext = getUserContext(req);
    if (!userContext) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId } = userContext;

    const client = await pool.connect();

    try {  
        const hashPass = await hashPassword(password);
        const { rows } = await client.query(`SELECT user_id FROM auth.users WHERE LOWER(name) = LOWER($1) AND LOWER(last_name) = LOWER($2) AND fk_status_id != 3 LIMIT 1`, [name, lastName]);
    
        if (rows.length) return res.status(400).json({ message: `Ya existe un usuario con el nombre ${name} y apellido ${lastName}. Verificar` });
    
        const {rows: rows2 } = await client.query(`INSERT INTO auth.users (fk_profile_id, name, last_name, email, username, password, fk_status_id, register_user, update_user) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING user_id`, [profileId, name, lastName, email, username, hashPass, stateId, userId, userId]);
        
        if (rows2[0]?.user_id > 0) return res.status(200).json({ message: `Usuario ${name} creado correctamente`, id: rows2[0]?.user_id || null});

        res.status(400).json({ message: "Ocurrió un error al crear el usuario en base de datos" });      
   
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });;
    } finally {
      if (client) client.release();
    }
};

export const updateUser = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const {  profileId, name, lastName, email, username, password, stateId, userId } = req.body as UserForm & { userId: number };   

    const userContext = getUserContext(req);
    if (!userContext) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId: userIdContext } = userContext;

    const client = await pool.connect();

    try {  
        const { rows } = await client.query(`SELECT user_id FROM auth.users WHERE LOWER(name) = LOWER($1) AND LOWER(last_name) = LOWER($2) AND fk_status_id != 3 AND user_id != $3 LIMIT 1`, [name, lastName, userId]);
        
        if (rows.length) return res.status(400).json({ message: `Ya existe un usuario con el nombre ${name} y apellido ${lastName}. Verificar` });
        
        const { rowCount } = await client.query(`UPDATE auth.users SET fk_profile_id = $1, name = $2, last_name = $3, email = $4, username = $5, fk_status_id = $6, update_user = $7, update_date = $8 WHERE user_id = $9`, [profileId, name, lastName, email, username, stateId, userIdContext, new Date(), userId]);
        
        if (password) {
            const hashPass = await hashPassword(password);
            await client.query(`UPDATE auth.users SET password = $1 WHERE user_id = $2`, [hashPass, userId]);
        }
        
        if (rowCount > 0) return res.status(200).json({ message: `Usuario ${name} modificado correctamente`});

        res.status(400).json({ message: "Ocurrió un error al modificar el usuario en base de datos" });      
   
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });;
    } finally {
      if (client) client.release();
    }
};

export const deleteUser = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const { userId } = req.body as { userId: number };
    
    const userContext = getUserContext(req);
    if (!userContext) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId: userIdContext } = userContext;

    const client = await pool.connect();

    try {
        
        const { rowCount } = await client.query(`UPDATE auth.users SET fk_status_id = 3, update_user = $1, update_date = $2 WHERE user_id = $3`, [userIdContext, new Date(), userId]);
        
        if (rowCount > 0) return res.status(200).json({ message: `Usuario eliminado correctamente`});

        res.status(400).json({ message: "Ocurrió un error al eliminar el usuario en base de datos" });      
   
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });;
    } finally {
      if (client) client.release();
    }
};
