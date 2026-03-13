import { Router} from 'express';
const router = Router();

import { verifyToken } from '../middleware/authJwt';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomers } from '../controller/customersController';

router.post('/list_customers', verifyToken, listCustomers);

router.post('/create_customer', verifyToken, createCustomer);

router.put('/update_customer', verifyToken, updateCustomer);

router.put('/delete_customer', verifyToken, deleteCustomer);

router.get('/get_customers', verifyToken, getCustomers);

export default router; 
