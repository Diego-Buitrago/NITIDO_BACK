import { Request, Response } from 'express';
import { pool } from '../db/connection';
import { AuthenticatedRequest, GeneralResponse, Pagination } from '../interfaces/general';
import { Receipt, ReceiptCountByStatus, ReceiptDetail, ReceiptFilters, ReceiptForm, ResponseReceiptList } from '../interfaces/receipts';
import { getUserContext, normalizeDate } from '../utils/utils';
import { generateReceiptPDFBuffer, ReceiptPDFData } from '../utils/pdfGenerator';

export const listReceipts = async (req: Request, res: Response<ResponseReceiptList>) => {
    const { limit, offset, sortField, sortOrder, receiptNumber, customerId, typePaymentId, stateId, date } = req.body as Pagination & ReceiptFilters;

    const order = sortOrder === 1 ? "ASC" : "DESC";

    const whereConditions = [];
    const queryParams: (string | number | Date)[] = [];
    let paramIndex = 1;

    if (receiptNumber) {
        whereConditions.push(`LPAD(r.number::TEXT, 4, '0') LIKE $${paramIndex}`);
        queryParams.push(`%${receiptNumber}%`);
        paramIndex++;
    }

    if (customerId) {
        whereConditions.push(`r.fk_customer_id = $${paramIndex}`);
        queryParams.push(customerId);
        paramIndex++;
    }

    if (typePaymentId) {
        whereConditions.push(`r.fk_type_payment_id = $${paramIndex}`);
        queryParams.push(typePaymentId);
        paramIndex++;
    }

    if (stateId) {
        whereConditions.push(`r.fk_rec_state_id = $${paramIndex}`);
        queryParams.push(stateId);
        paramIndex++;
    }

    if (date && date.length === 2) {
        const fromDate = normalizeDate(date[0]);
        const toDate = normalizeDate(date[1] ?? date[0]);

        if (fromDate && toDate) {
            whereConditions.push(`(r.date BETWEEN $${paramIndex} AND $${paramIndex + 1})`);
            queryParams.push(fromDate, toDate);
            paramIndex += 2;
        }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // Mapeo de alias
    const sortFieldMap: Record<string, string> = {
        receiptNumber: "r.number",
        customer: "c.name",
        typePayment: "tp.name",
        state: "rs.name",
        receiptId: "r.receipt_id"
    };

    const sortColumn = sortFieldMap[sortField] || `r.${sortField}`;

    const client = await pool.connect();

    try {
        const from = `FROM sales.receipts r JOIN admin.customers c ON r.fk_customer_id = c.customer_id JOIN admin.types_payment tp ON r.fk_type_payment_id = tp.type_payment_id JOIN sales.receipt_states rs ON r.fk_rec_state_id = rs.rec_state_id`;

        const { rows } = await client.query<Receipt>(`
            SELECT r.receipt_id "receiptId", r.prefix, LPAD(r.number::TEXT, 4, '0') "receiptNumber", r.date, r.fk_customer_id "customerId", c.name customer, r.fk_type_payment_id "typePaymentId", tp.name "typePayment", r.observation, r.subtotal, r.discount, r.tax, r.total, r.fk_rec_state_id "stateId", rs.name "state" ${from} ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, 
            [...queryParams, limit, offset]);

        const { rows: rowTotal } = await client.query(`SELECT COUNT(DISTINCT r.receipt_id) total ${from} ${whereClause}`, queryParams);

        return res.status(200).json({ results: rows, total: +rowTotal[0].total });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
};

export const createReceipt = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const { date, customerId, typePaymentId, observation, subtotal, discount, tax, total, stateId, details } = req.body as ReceiptForm;

    const userContext = getUserContext(req);
    if (!userContext) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId } = userContext;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Insertar recibo con secuencia
        const { rows } = await client.query(`INSERT INTO sales.receipts (number, date, fk_customer_id, fk_type_payment_id, observation, subtotal, discount, tax, total, fk_rec_state_id, register_user, update_user) VALUES (nextval('sales.receipt_number_seq'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING receipt_id, CONCAT(prefix, '-', LPAD(number::TEXT, 4, '0')) AS "receiptNumber"`, [date, customerId, typePaymentId, observation, subtotal, discount, tax, total, stateId, userId, userId]);

        const receiptId = rows[0].receipt_id;
        const receiptNumber = rows[0].receiptNumber;

        // Insertar detalles
        for (const detail of details) {
            const detailTotal = detail.quantity * detail.price;
            await client.query(`INSERT INTO sales.receipt_details (fk_receipt_id, fk_product_id, quantity, price, total, register_user, update_user) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [receiptId, detail.productId, detail.quantity, detail.price, detailTotal, userId, userId]);
        }

        await client.query('COMMIT');

        return res.status(200).json({ message: `Recibo ${receiptNumber} creado correctamente`, id: receiptId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
};

export const updateReceipt = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const { date, customerId, typePaymentId, observation, subtotal, discount, tax, total, stateId, details } = req.body as ReceiptForm;
    const { receiptId } = req.body as { receiptId: number };

    const userContext = getUserContext(req);
    if (!userContext) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId } = userContext;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verificar que el recibo existe y no está cancelado
        const { rows: receiptRows } = await client.query(`SELECT receipt_id FROM sales.receipts WHERE receipt_id = $1 AND fk_rec_state_id != 3`, [receiptId]);

        if (receiptRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Recibo no encontrado o ya fue cancelado' });
        }

        // Obtener detalles anteriores como mapa para comparación
        const { rows: oldDetails } = await client.query(`SELECT fk_product_id, quantity, price FROM sales.receipt_details WHERE fk_receipt_id = $1 AND fk_status_id != 3`, [receiptId]);
        const oldDetailsMap = new Map(oldDetails.map(d => [d.fk_product_id, { quantity: d.quantity, price: d.price }])); // Crear mapa de detalles anteriores

        // Procesar nuevos detalles: actualizar existentes o insertar nuevos
        for (const detail of details) {
            const old = oldDetailsMap.get(detail.productId); // Buscar detalle existente

            if (old) {
                // Producto existente: actualizar si cambió cantidad o precio
                if (detail.quantity !== old.quantity || detail.price !== old.price) {
                    const detailTotal = detail.quantity * detail.price;
                    await client.query(
                        `UPDATE sales.receipt_details SET quantity = $1, price = $2, total = $3, update_user = $4, update_date = NOW() WHERE fk_receipt_id = $5 AND fk_product_id = $6 AND fk_status_id != 3`,
                        [detail.quantity, detail.price, detailTotal, userId, receiptId, detail.productId]
                    );
                }

                oldDetailsMap.delete(detail.productId);
            } else {
                // Producto nuevo: insertar
                const detailTotal = detail.quantity * detail.price;
                await client.query(
                    `INSERT INTO sales.receipt_details (fk_receipt_id, fk_product_id, quantity, price, total, register_user, update_user) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [receiptId, detail.productId, detail.quantity, detail.price, detailTotal, userId, userId]
                );
            }
        }

        // Eliminar detalles que ya no están (soft delete)
        for (const [productId] of oldDetailsMap) {
            await client.query(`UPDATE sales.receipt_details SET fk_status_id = 3, update_user = $1, update_date = NOW() WHERE fk_receipt_id = $2 AND fk_product_id = $3`, [userId, receiptId, productId]);
        }

        // Actualizar cabecera del recibo
        await client.query(`UPDATE sales.receipts SET date = $1, fk_customer_id = $2, fk_type_payment_id = $3, observation = $4, subtotal = $5, discount = $6, tax = $7, total = $8, fk_rec_state_id = $9, update_user = $10, update_date = $11 WHERE receipt_id = $12`, [date, customerId, typePaymentId, observation, subtotal, discount, tax, total, stateId, userId, new Date(), receiptId]);

        await client.query('COMMIT');

        return res.status(200).json({ message: 'Recibo modificado correctamente' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
};

export const cancelReceipt = async (req: Request & AuthenticatedRequest, res: Response<GeneralResponse>) => {
    const { receiptId } = req.body as { receiptId: number };

    const userContext = getUserContext(req);
    if (!userContext) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const { userId } = userContext;
    const client = await pool.connect();

    try {
        const { rowCount } = await client.query(`UPDATE sales.receipts SET fk_rec_state_id = 3, update_user = $1, update_date = $2 WHERE receipt_id = $3`, [userId, new Date(), receiptId]);

        if (rowCount > 0) return res.status(200).json({ message: 'Recibo cancelado correctamente' });

        return res.status(400).json({ message: 'Ocurrio un error al cancelar el recibo' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
};

export const countReceiptsByStatus = async (_req: Request, res: Response<ReceiptCountByStatus[] | { message: string }>) => {
    const client = await pool.connect();

    try {
        const { rows } = await client.query<ReceiptCountByStatus>(`SELECT COUNT(r.receipt_id) quantity, e.name, e.rec_state_id id FROM sales.receipt_states e LEFT JOIN sales.receipts r ON e.rec_state_id = r.fk_rec_state_id GROUP BY id, e.name ORDER BY id`);

        return res.status(200).json(rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
};

export const getReceiptDetails = async (req: Request, res: Response<ReceiptDetail[] | { message: string }>) => {
    const { id } = req.params;

    const client = await pool.connect();

    try {
        const { rows } = await client.query<ReceiptDetail>(`SELECT rd.rec_det_id "recDetId", rd.fk_product_id "productId", p.name "product", rd.quantity, rd.price, rd.total FROM sales.receipt_details rd JOIN admin.products p ON rd.fk_product_id = p.product_id WHERE rd.fk_receipt_id = $1 AND rd.fk_status_id != 3`, [id]);

        return res.status(200).json(rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
};

export const generateReceiptPDF = async (req: Request, res: Response) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        const { rows: receiptRows } = await client.query(`
            SELECT r.receipt_id "receiptId", CONCAT(r.prefix, '-', LPAD(r.number::TEXT, 4, '0')) "receiptNumber", r.date, c.name "customerName", c.document_number "customerDocument", c.phone "customerPhone", c.address "customerAddress", tp.name "typePayment", r.observation, r.subtotal, r.discount, r.tax, r.total
            FROM sales.receipts r JOIN admin.customers c ON r.fk_customer_id = c.customer_id JOIN admin.types_payment tp ON r.fk_type_payment_id = tp.type_payment_id WHERE r.receipt_id = $1
        `, [id]);

        if (receiptRows.length === 0) {
            return res.status(404).json({ message: 'Recibo no encontrado' });
        }

        const receipt = receiptRows[0];

        const { rows: detailRows } = await client.query<ReceiptDetail>(`SELECT rd.rec_det_id "recDetId", rd.fk_product_id "productId", p.name "product", rd.quantity, rd.price, rd.total FROM sales.receipt_details rd JOIN admin.products p ON rd.fk_product_id = p.product_id WHERE rd.fk_receipt_id = $1 AND rd.fk_status_id != 3`, [id]);

        const pdfData: ReceiptPDFData = {
            receiptNumber: receipt.receiptNumber,
            date: new Date(receipt.date),
            customerName: receipt.customerName,
            customerDocument: receipt.customerDocument || 'N/A',
            customerPhone: receipt.customerPhone || 'N/A',
            customerAddress: receipt.customerAddress || 'N/A',
            items: detailRows.map(d => ({
                description: d.product,
                quantity: d.quantity,
                unitPrice: d.price,
                subtotal: d.total
            })),
            subtotal: parseFloat(receipt.subtotal),
            discount: parseFloat(receipt.discount),
            tax: parseFloat(receipt.tax),
            total: parseFloat(receipt.total),
            paymentMethod: receipt.typePayment,
            notes: receipt.observation || ''
        };

        const buffer = await generateReceiptPDFBuffer(pdfData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Recibo_${receipt.receiptNumber}.pdf`);
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al generar el PDF: ' + (error as Error).message });
    } finally {
        if (client) client.release();
    }
};

