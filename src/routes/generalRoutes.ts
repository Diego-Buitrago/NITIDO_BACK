import { Router} from 'express';
const router = Router();

import { getProfiles, getTypePayments, getReceiptStates, validateToken } from '../controller/generarController';
import { verifyToken } from '../middleware/authJwt';

router.get('/validate_token', verifyToken, validateToken);

router.get('/get_profiles', verifyToken, getProfiles);

router.get('/get_type_payments', verifyToken, getTypePayments);

router.get('/get_receipt_states', verifyToken, getReceiptStates);
  
export default router; 
