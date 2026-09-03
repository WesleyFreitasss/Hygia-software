import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { isNivelAcesso, type NivelAcesso, type TokenPayload } from '../types/user';

/**
 * Le o header `Authorization: Bearer <token>`, valida a assinatura e
 * preenche `req.usuario`. Use em qualquer rota do CRM que exija sessao.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(HttpError.unauthorized('Token de autenticacao ausente.'));
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });

    if (typeof payload === 'string' || !payload.sub || !isNivelAcesso(payload.nivelAcesso)) {
      return next(HttpError.unauthorized('Token com formato invalido.'));
    }

    req.usuario = {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      nivelAcesso: payload.nivelAcesso,
    } satisfies TokenPayload;

    next();
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      return next(HttpError.unauthorized('Sessao expirada. Faca login novamente.'));
    }
    next(HttpError.unauthorized('Token invalido.'));
  }
}

/**
 * Restringe a rota a determinados niveis de acesso.
 * Ex.: `router.get('/relatorios', authMiddleware, exigirNivel('admin'), handler)`
 */
export function exigirNivel(...niveis: NivelAcesso[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.usuario) return next(HttpError.unauthorized());
    if (!niveis.includes(req.usuario.nivelAcesso)) {
      return next(HttpError.forbidden('Seu nivel de acesso nao permite esta operacao.'));
    }
    next();
  };
}
