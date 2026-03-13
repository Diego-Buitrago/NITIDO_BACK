import { Request, Response } from 'express';
import { pool } from '../db/connection';
import { AuthenticatedRequest, GeneralList, GeneralResponse, Pagination } from '../interfaces/general';
import { Product, ProductFilters, ProductForm, ResponseList } from '../interfaces/products';
import { getUserContext } from '../utils/utils';

export const listProducts = async (req: Request, res: Response<ResponseList>) => {
    const { limit, offset, sortField, sortOrder, name, description, price, state } = req.body as Pagination & ProductFilters;

    const order = sortOrder === 1 ? "ASC" : "DESC";

    const whereConditions = ["p.fk_status_id != 3"];
    const queryParams = [];
    let paramIndex = 1;

    if (name) {
        whereConditions.push(`LOWER(p.name) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${name}%`);
        paramIndex++;
    }

    if (description) {
        whereConditions.push(`LOWER(p.description) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${description}%`);
        paramIndex++;
    }

    if (price) {
        whereConditions.push(`p.price = $${paramIndex}`);
        queryParams.push(price);
        paramIndex++;
    }

    if (state) {
        whereConditions.push(`p.fk_status_id = $${paramIndex}`);
        queryParams.push(state);
        paramIndex++;
    }

    // Construct the WHERE clause
    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;
        // Mapeo solo de alias (campos con "")
    const sortFieldMap: Record<string, string> = {
        name: "p.name",
        state: "s.name"
    };

    const sortColumn = sortFieldMap[sortField] || `p.${sortField}`;

    // Obtener una conexión del pool
    const client = await pool.connect();

    try {
        const from = "FROM admin.products p JOIN admin.status s ON p.fk_status_id = s.status_id";      

        const { rows } = await client.query<Product>(`SELECT p.product_id "productId", p.name, p.description, p.price, s.name state, p.fk_status_id "stateId" ${from} ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...queryParams, limit, offset]);
    
        const { rows: rowTotal } = await client.query(`SELECT COUNT(DISTINCT p.product_id) total ${from} ${whereClause}`, queryParams);
    
        return res.status(200).json({ results: rows, total: +rowTotal[0].total });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
      if (client) client.release();
    }
};

export const createProduct = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const { name, description, price, stateId } = req.body as ProductForm;
    
    const userContext = getUserContext(req);
    if (!userContext) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId } = userContext;

    const client = await pool.connect();

    try {  
        const { rows } = await client.query(`SELECT product_id FROM admin.products WHERE LOWER(name) = LOWER($1) AND fk_status_id != 3 LIMIT 1`, [name]);
    
        if (rows.length) return res.status(400).json({ message: `Ya existe un producto con el nombre ${name}. Verificar` });
    
        const {rows: rows2 } = await client.query(`INSERT INTO admin.products (name, description, price, fk_status_id, register_user, update_user) VALUES($1,$2,$3,$4,$5,$6) RETURNING product_id`, [name, description, price, stateId, userId, userId]);
        
        if (rows2[0]?.product_id > 0) return res.status(200).json({ message: `Producto ${name} creado correctamente`, id: rows2[0]?.product_id || null});

        res.status(400).json({ message: "Ocurrió un error al crear el producto en base de datos" });      
   
    } catch (error) {
      console.log(error);   
      return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });;
    } finally {
      if (client) client.release();
    }
};

export const updateProduct = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const { name, description, price, stateId, productId } = req.body as ProductForm & { productId: number };
   
    const userContext = getUserContext(req);
    if (!userContext) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId } = userContext;

    const client = await pool.connect();    

    try {  
        const { rows } = await client.query(`SELECT product_id FROM admin.products WHERE LOWER(name) = LOWER($1) AND fk_status_id != 3 AND product_id != $2 LIMIT 1`, [name, productId]);
        
        if (rows.length) return res.status(400).json({ message: `Ya existe una producto con el nombre ${name}. Verificar` });
        
        const { rowCount } = await client.query(`UPDATE admin.products SET name = $1, description = $2, price = $3, fk_status_id = $4, update_user = $5, update_date = $6 WHERE product_id = $7`, [name, description, price, stateId, userId, new Date(), productId]);
        
        if (rowCount > 0) return res.status(200).json({ message: `Producto ${name} modificado correctamente`});

        res.status(400).json({ message: "Ocurrió un error al modificar el producto en base de datos" });      
   
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });;
    } finally {
      if (client) client.release();
    }
};

export const deleteProduct = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const { productId } = req.body as { productId: number };

    const userContext = getUserContext(req);
    if (!userContext) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId } = userContext;

    const client = await pool.connect();

    try {        
        const { rowCount } = await client.query(`UPDATE admin.products SET fk_status_id = 3, update_user = $1, update_date = $2 WHERE product_id = $3`, [userId, new Date(), productId]);
        
        if (rowCount > 0) return res.status(200).json({ message: `Producto eliminado correctamente`});

        res.status(400).json({ message: "Ocurrió un error al eliminar el producto en base de datos" });      
   
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });;
    } finally {
      if (client) client.release();
    }
};

export const getProducts = async (req: Request, res: Response<GeneralList[] | { message: string }>) => {
    const { productId=0 } = req.query as { productId: string };

    // Obtener una conexión del pool
    const client = await pool.connect();
    try {   
        const { rows } = await client.query<GeneralList>(`SELECT product_id id, name, price FROM admin.products WHERE fk_status_id = 1 OR product_id = $1 ORDER BY name`, [productId]);   

        return res.status(200).json(rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
      if (client) client.release();
    }
}
