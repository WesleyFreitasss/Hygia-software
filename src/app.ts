import cors from 'cors';
import express, { type Express } from 'express';

import { env } from './config/env';
import { authRoutes } from './routes/authRoutes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

/**
 * Monta a aplicacao Express sem subir o servidor nem abrir o banco.
 * Separar `app` de `server` deixa a API testavel (supertest/vitest).
 */
export function criarApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  /*
   * Quantos proxies a frente confiar ao resolver o IP do cliente.
   * O padrao e 0 (nenhum) de proposito: com `true`, qualquer um poderia forjar
   * X-Forwarded-For e escapar do rate limit. Atras de Nginx/ELB, ajuste
   * TRUST_PROXY para o numero real de saltos.
   */
  app.set('trust proxy', env.trustProxy);

  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', servico: 'hygia-api', horario: new Date().toISOString() });
  });

  app.use('/auth', authRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
