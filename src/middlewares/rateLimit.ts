import rateLimit, { type Options } from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import { HttpError } from '../utils/httpError';

const janelaMs = env.rateLimit.janelaMinutos * 60_000;

/**
 * Limitadores por IP para as rotas de autenticacao.
 *
 * A contagem fica na memoria do processo: suficiente para uma instancia so.
 * Rodando em varias replicas, troque por um store compartilhado (Redis), senao
 * cada instancia conta em separado e o teto efetivo vira N vezes maior.
 */
function criarLimitador(max: number, mensagem: string) {
  const opcoes: Partial<Options> = {
    windowMs: janelaMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Erro no mesmo formato do resto da API, via errorHandler.
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(new HttpError(429, mensagem));
    },
  };
  return rateLimit(opcoes);
}

/** Teto geral de qualquer chamada em /auth, como rede de seguranca. */
export const limiteAuthGeral = criarLimitador(
  env.rateLimit.maxGeral,
  `Muitas requisicoes. Tente novamente em ${env.rateLimit.janelaMinutos} minutos.`,
);

/** Protecao central contra forca bruta de senha. */
export const limiteLogin = criarLimitador(
  env.rateLimit.maxLogin,
  `Muitas tentativas de login. Aguarde ${env.rateLimit.janelaMinutos} minutos e tente de novo.`,
);

/** Evita usar a recuperacao de senha para inundar caixas de entrada. */
export const limiteRecuperacao = criarLimitador(
  env.rateLimit.maxRecuperacao,
  `Muitos pedidos de recuperacao. Aguarde ${env.rateLimit.janelaMinutos} minutos e tente de novo.`,
);

/** Freia a criacao de contas em massa. */
export const limiteCadastro = criarLimitador(
  env.rateLimit.maxCadastro,
  `Muitas contas criadas a partir deste endereco. Aguarde ${env.rateLimit.janelaMinutos} minutos.`,
);
