import { Request, Response } from 'express';
import { pool } from '../db/connection';
import { AuthenticatedRequest, GeneralList, GeneralResponse, Pagination } from '../interfaces/general';
import { Customer, CustomerFilters, CustomerForm, ResponseList } from '../interfaces/customers';
import { getUserContext } from '../utils/utils';

export const listCustomers = async (req: Request, res: Response<ResponseList>) => {
    const { limit, offset, sortField, sortOrder, name, lastName, documentNumber, email, cellPhone, phone, address, state } = req.body as Pagination & CustomerFilters;

    const order = sortOrder === 1 ? "ASC" : "DESC";

    const whereConditions = ["c.fk_status_id != 3"];
    const queryParams = [];
    let paramIndex = 1;

    if (name) {
        whereConditions.push(`LOWER(c.name) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${name}%`);
        paramIndex++;
    }

    if (lastName) {
        whereConditions.push(`LOWER(c.last_name) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${lastName}%`);
        paramIndex++;
    }

    if (documentNumber) {
        whereConditions.push(`LOWER(c.document_number) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${documentNumber}%`);
        paramIndex++;
    }

    if (email) {
        whereConditions.push(`LOWER(c.email) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${email}%`);
        paramIndex++;
    }

    if (cellPhone) {
        whereConditions.push(`LOWER(c.cell_phone) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${cellPhone}%`);
        paramIndex++;
    }

    if (phone) {
        whereConditions.push(`LOWER(c.phone) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${phone}%`);
        paramIndex++;
    }

    if (state) {
        whereConditions.push(`c.fk_status_id = $${paramIndex}`);
        queryParams.push(state);
        paramIndex++;
    }

    if (address) {
        whereConditions.push(`LOWER(c.address) LIKE LOWER($${paramIndex})`);
        queryParams.push(`%${address}%`);
        paramIndex++;
    }

    // Construct the WHERE clause
    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    // Mapeo solo de alias (campos con "")
    const sortFieldMap: Record<string, string> = {
        lastName: "c.last_name",
        documentNumber: "c.document_number",
        cellPhone: "c.cell_phone",
        state: "s.name"
    };

    const sortColumn = sortFieldMap[sortField] || `c.${sortField}`;

    // Obtener una conexión del pool
    const client = await pool.connect();

    try {
        const from = "FROM admin.customers c JOIN admin.status s ON c.fk_status_id = s.status_id";

        const { rows } = await client.query<Customer>(`SELECT c.customer_id "customerId", c.name, c.last_name "lastName", c.document_number "documentNumber", c.email, c.cell_phone "cellPhone", c.phone, c.address, s.name state, c.fk_status_id "stateId" ${from} ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...queryParams, limit, offset]);

        const { rows: rowTotal } = await client.query(`SELECT COUNT(DISTINCT c.customer_id) total ${from} ${whereClause}`, queryParams);

        return res.status(200).json({ results: rows, total: +rowTotal[0].total });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
};

export const createCustomer = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const { name, lastName, documentNumber, email, cellPhone, phone, address, stateId } = req.body as CustomerForm;

    const userContext = getUserContext(req);
    if (!userContext) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId } = userContext;

    const client = await pool.connect();

    try {
        const { rows } = await client.query(`SELECT customer_id FROM admin.customers WHERE LOWER(name) = LOWER($1) AND LOWER(last_name) = LOWER($2) AND fk_status_id != 3 LIMIT 1`, [name, lastName]);

        if (rows.length) return res.status(400).json({ message: `Ya existe un cliente con el nombre '${name}' '${lastName}'. Verificar` });

        const { rows: rows2 } = await client.query(`INSERT INTO admin.customers (name, last_name, document_number, email, cell_phone, phone, address, fk_status_id, register_user, update_user) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING customer_id`, [name, lastName, documentNumber, email, cellPhone, phone, address, stateId, userId, userId]);

        if (rows2[0]?.customer_id > 0) return res.status(200).json({ message: `cliente ${name} ${lastName} creado correctamente`, id: rows2[0]?.customer_id || null });

        res.status(400).json({ message: "Ocurrió un error al crear el cliente en base de datos" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
};

export const updateCustomer = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const { name, lastName, documentNumber, email, cellPhone, phone, address, stateId, customerId } = req.body as CustomerForm & { customerId: number };
    const userContext = getUserContext(req);
    if (!userContext) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId } = userContext;

    const client = await pool.connect();

    try {
        const { rows } = await client.query(`SELECT customer_id FROM admin.customers WHERE LOWER(name) = LOWER($1) AND LOWER(last_name) = LOWER($2) AND fk_status_id != 3 AND customer_id != $3 LIMIT 1`, [name, lastName, customerId]);

        if (rows.length) return res.status(400).json({ message: `Ya existe un cliente con el nombre ${name} ${lastName}. Verificar` });

        const { rowCount } = await client.query(`UPDATE admin.customers SET name = $1, last_name = $2, document_number = $3, email = $4, cell_phone = $5, phone = $6, address = $7, fk_status_id = $8, update_user = $9, update_date = $10 WHERE customer_id = $11`, [name, lastName, documentNumber, email, cellPhone, phone, address, stateId, userId, new Date(), customerId]);

        if (rowCount > 0) return res.status(200).json({ message: `Cliente ${name} ${lastName} modificado correctamente` });

        res.status(400).json({ message: "Ocurrió un error al modificar el cliente en base de datos" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
};

export const deleteCustomer = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const { customerId } = req.body as { customerId: number };

    const userContext = getUserContext(req);
    if (!userContext) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId } = userContext;
    const client = await pool.connect();

    try {
        const { rowCount } = await client.query(`UPDATE admin.customers SET fk_status_id = 3, update_user = $1, update_date = $2 WHERE customer_id = $3`, [userId, new Date(), customerId]);

        if (rowCount > 0) return res.status(200).json({ message: `Cliente eliminado correctamente` });

        res.status(400).json({ message: "Ocurrió un error al eliminar el cliente en base de datos" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
};

export const getCustomers = async (req: Request, res: Response<GeneralList[] | { message: string }>) => {
    const { customerId = 0 } = req.query as { customerId: string };

    // Obtener una conexión del pool
    const client = await pool.connect();
    try {
        const { rows } = await client.query<GeneralList>(`SELECT customer_id id, CONCAT(name, ' ', last_name) name FROM admin.customers WHERE fk_status_id = 1 OR customer_id = $1 ORDER BY name`, [customerId]);

        return res.status(200).json(rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
}
