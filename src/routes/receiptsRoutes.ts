import { Router } from 'express';
const router = Router();

import { verifyToken } from '../middleware/authJwt';
import { listReceipts, createReceipt, updateReceipt, cancelReceipt, countReceiptsByStatus, getReceiptDetails, generateReceiptPDF } from '../controller/receiptsController';

router.post('/list_receipts', verifyToken, listReceipts);

router.post('/create_receipt', verifyToken, createReceipt);

router.put('/update_receipt', verifyToken, updateReceipt);

router.put('/cancel_receipt', verifyToken, cancelReceipt);

router.get('/count_receipts_by_status', verifyToken, countReceiptsByStatus);

router.get('/get_receipt_details/:id', verifyToken, getReceiptDetails);

router.get('/generate_pdf/:id', verifyToken, generateReceiptPDF);

export default router;
