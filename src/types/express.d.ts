import type { TokenPayload } from './user';

/**
 * Declaration merging: disponibiliza `req.usuario` (preenchido pelo
 * authMiddleware) para todos os handlers, com tipagem.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: TokenPayload;
    }
  }
}

export {};
