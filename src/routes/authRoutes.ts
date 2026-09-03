import { Router } from 'express';

import { authController } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

/** POST /auth/register - cria a conta e ja devolve a sessao. */
router.post('/register', authController.register);

/** POST /auth/login - valida credenciais e devolve o JWT. */
router.post('/login', authController.login);

/** POST /auth/forgot-password - gera o token de recuperacao. */
router.post('/forgot-password', authController.forgotPassword);

/** POST /auth/reset-password - consome o token e troca a senha. */
router.post('/reset-password', authController.resetPassword);

/** GET /auth/me - rota protegida, confere a sessao atual. */
router.get('/me', authMiddleware, authController.me);

export const authRoutes = router;
