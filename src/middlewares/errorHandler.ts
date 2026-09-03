import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

/** 404 para qualquer rota nao registrada. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ erro: `Rota nao encontrada: ${req.method} ${req.originalUrl}` });
}

/**
 * Handler de erros. Precisa dos 4 parametros para o Express reconhece-lo
 * como middleware de erro, mesmo que `next` nao seja usado.
 */
export function errorHandler(
  erro: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (erro instanceof HttpError) {
    res.status(erro.status).json({
      erro: erro.message,
      ...(erro.detalhes ? { detalhes: erro.detalhes } : {}),
    });
    return;
  }

  // JSON malformado no corpo da requisicao (lancado pelo express.json()).
  if (erro instanceof SyntaxError && 'body' in erro) {
    res.status(400).json({ erro: 'JSON invalido no corpo da requisicao.' });
    return;
  }

  console.error('[erro nao tratado]', erro);
  res.status(500).json({
    erro: 'Erro interno do servidor.',
    ...(env.isProducao ? {} : { detalhes: erro instanceof Error ? erro.message : String(erro) }),
  });
}
