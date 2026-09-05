import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { authService } from '../services/authService';
import { isNivelAcesso, type NivelAcesso, type TokenPayload } from '../types/user';

/**
 * Le o header `Authorization: Bearer <token>`, valida a assinatura e confirma
 * no banco que a sessao continua valendo (ver `validarSessao`). Preenche
 * `req.usuario` com o payload e `req.usuarioAutenticado` com o registro atual.
 *
 * O custo e uma leitura por requisicao autenticada - o preco de poder revogar
 * um JWT antes de ele expirar.
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(HttpError.unauthorized('Token de autenticacao ausente.'));
  }

  const token = header.slice('Bearer '.length).trim();

  let payload: TokenPayload;
  try {
    const bruto = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });

    if (
      typeof bruto === 'string' ||
      !bruto.sub ||
      !isNivelAcesso(bruto.nivelAcesso) ||
      typeof bruto.tokenVersion !== 'number'
    ) {
      return next(HttpError.unauthorized('Token com formato invalido.'));
    }

    payload = {
      sub: bruto.sub,
      email: String(bruto.email ?? ''),
      nivelAcesso: bruto.nivelAcesso,
      tokenVersion: bruto.tokenVersion,
    };
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      return next(HttpError.unauthorized('Sessao expirada. Faca login novamente.'));
    }
    return next(HttpError.unauthorized('Token invalido.'));
  }

  try {
    // Confere no banco se o token ainda corresponde a versao vigente.
    req.usuarioAutenticado = await authService.validarSessao(payload);
    req.usuario = payload;
    next();
  } catch (erro) {
    next(erro);
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
