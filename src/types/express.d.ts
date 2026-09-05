import type { PublicUser, TokenPayload } from './user';

/**
 * Declaration merging: disponibiliza os campos que o authMiddleware preenche
 * para todos os handlers, com tipagem.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Conteudo do JWT, ja validado. */
      usuario?: TokenPayload;
      /** Registro atual do usuario, lido do banco na mesma checagem. */
      usuarioAutenticado?: PublicUser;
    }
  }
}

export {};
