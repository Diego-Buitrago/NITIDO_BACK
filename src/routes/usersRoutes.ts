import { Router} from 'express';
const router = Router();

import {  createUser, deleteUser, listUsers, startSection, updateUser } from '../controller/usersController';
import { verifyToken } from '../middleware/authJwt';

router.post('/start_section', startSection);

router.post('/list_users', verifyToken, listUsers);

router.post('/create_user', verifyToken, createUser);

router.put('/update_user', verifyToken, updateUser);

router.put('/delete_user', verifyToken, deleteUser);
  
export default router; 