import { Router} from 'express';
const router = Router();

import { verifyToken } from '../middleware/authJwt';
import { listProducts, createProduct, updateProduct, deleteProduct, getProducts } from '../controller/productsController';

router.post('/list_products', verifyToken, listProducts);

router.post('/create_product', verifyToken, createProduct);

router.put('/update_product', verifyToken, updateProduct);

router.put('/delete_product', verifyToken, deleteProduct);

router.get('/get_products', verifyToken, getProducts);

export default router; 
