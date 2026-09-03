import 'dotenv/config';
import type { SignOptions } from 'jsonwebtoken';

const isProducao = process.env.NODE_ENV === 'production';

/** Segredo de desenvolvimento: aceitavel local, proibido em producao. */
const SEGREDO_DEV = 'hygia-dev-secret-nao-usar-em-producao';

function lerJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    if (isProducao) {
      throw new Error(
        'JWT_SECRET nao definido. A aplicacao nao pode subir em producao sem um segredo proprio.',
      );
    }
    console.warn('[env] JWT_SECRET ausente - usando segredo de desenvolvimento. Nao use isso em producao.');
    return SEGREDO_DEV;
  }

  if (isProducao && secret === SEGREDO_DEV) {
    throw new Error('JWT_SECRET esta com o valor de desenvolvimento. Gere um segredo proprio.');
  }

  return secret;
}

function lerInteiro(nome: string, padrao: number): number {
  const bruto = process.env[nome];
  if (!bruto) return padrao;

  const valor = Number.parseInt(bruto, 10);
  if (Number.isNaN(valor) || valor <= 0) {
    throw new Error(`${nome} deve ser um inteiro positivo (recebido: "${bruto}").`);
  }
  return valor;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProducao,
  port: lerInteiro('PORT', 3000),
  jwtSecret: lerJwtSecret(),
  /** Aceita os formatos do jsonwebtoken: "15m", "2h", "7d" ou segundos. */
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? '2h') as SignOptions['expiresIn'],
  bcryptSaltRounds: lerInteiro('BCRYPT_SALT_ROUNDS', 10),
  resetTokenTtlMinutes: lerInteiro('RESET_TOKEN_TTL_MINUTES', 30),
} as const;
