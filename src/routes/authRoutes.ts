import { Router } from 'express';

import { authController } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  limiteAuthGeral,
  limiteCadastro,
  limiteLogin,
  limiteRecuperacao,
} from '../middlewares/rateLimit';

const router = Router();

// Teto geral do grupo; cada rota sensivel ainda tem o seu limite proprio.
router.use(limiteAuthGeral);

/** POST /auth/register - cria a conta e ja devolve a sessao. */
router.post('/register', limiteCadastro, authController.register);

/** POST /auth/login - valida credenciais e devolve o JWT. */
router.post('/login', limiteLogin, authController.login);

/** POST /auth/forgot-password - gera o token e envia o e-mail de recuperacao. */
router.post('/forgot-password', limiteRecuperacao, authController.forgotPassword);

/** POST /auth/reset-password - consome o token, troca a senha e derruba as sessoes. */
router.post('/reset-password', limiteRecuperacao, authController.resetPassword);

/** GET /auth/me - rota protegida, confere a sessao atual. */
router.get('/me', authMiddleware, authController.me);

export const authRoutes = router;
