import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { NIVEL_ACESSO_PADRAO, userRepository, type UserRepository } from '../repositories/userRepository';
import { toPublicUser, type CreateUserInput, type PublicUser, type TokenPayload, type User } from '../types/user';
import type { LoginInput, ResetPasswordInput } from '../utils/validators';

export interface AuthResult {
  usuario: PublicUser;
  token: string;
  /** Segundos ate o token expirar - o front usa para agendar o refresh/logout. */
  expiraEm: number;
}

export interface ForgotPasswordResult {
  /**
   * Token puro. Existe apenas para desenvolvimento/testes enquanto o envio de
   * e-mail nao esta plugado. Em producao ele NAO e devolvido na resposta.
   */
  resetToken?: string;
  expiraEm?: Date;
}

/**
 * Hash descartavel usado quando o e-mail nao existe no login.
 * Comparar contra ele mantem o tempo de resposta parecido com o de um e-mail
 * valido, evitando que um atacante descubra quais e-mails estao cadastrados.
 */
const HASH_FALSO = bcrypt.hashSync('senha-inexistente-para-comparacao', env.bcryptSaltRounds);

export class AuthService {
  constructor(private readonly repo: UserRepository = userRepository) {}

  /** POST /auth/register */
  async register(input: CreateUserInput): Promise<AuthResult> {
    const existente = await this.repo.findByEmail(input.email);
    if (existente) {
      throw HttpError.conflict('Ja existe uma conta cadastrada com este e-mail.');
    }

    const senhaHash = await bcrypt.hash(input.senha, env.bcryptSaltRounds);

    const usuario = await this.repo.create({
      nome: input.nome,
      email: input.email,
      senhaHash,
      nivelAcesso: input.nivelAcesso ?? NIVEL_ACESSO_PADRAO,
      resetTokenHash: null,
      resetTokenExpiraEm: null,
    });

    return this.montarSessao(usuario);
  }

  /** POST /auth/login */
  async login({ email, senha }: LoginInput): Promise<AuthResult> {
    const usuario = await this.repo.findByEmail(email);

    // Comparamos sempre - com o hash real ou com o falso - para que a resposta
    // leve o mesmo tempo existindo ou nao o usuario.
    const senhaConfere = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FALSO);

    if (!usuario || !senhaConfere) {
      throw HttpError.unauthorized('E-mail ou senha incorretos.');
    }

    return this.montarSessao(usuario);
  }

  /**
   * POST /auth/forgot-password
   *
   * Gera um token de uso unico com validade curta. Guardamos apenas o SHA-256
   * do token: se o banco vazar, os tokens em transito continuam inuteis.
   * A resposta e sempre a mesma, exista ou nao a conta (evita enumeracao).
   */
  async forgotPassword(email: string): Promise<ForgotPasswordResult> {
    const usuario = await this.repo.findByEmail(email);
    if (!usuario) return {};

    const resetToken = randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + env.resetTokenTtlMinutes * 60_000);

    await this.repo.update(usuario.id, {
      resetTokenHash: hashToken(resetToken),
      resetTokenExpiraEm: expiraEm,
    });

    // TODO(integracao): enviar o link de redefinicao por e-mail
    // (ex.: `${APP_URL}/redefinir-senha?token=${resetToken}`) e parar de
    // devolver o token na resposta em qualquer ambiente.
    if (env.isProducao) return {};

    return { resetToken, expiraEm };
  }

  /**
   * POST /auth/reset-password
   * Consome o token gerado no passo anterior e troca a senha.
   */
  async resetPassword({ token, novaSenha }: ResetPasswordInput): Promise<void> {
    const usuario = await this.repo.findByResetTokenHash(hashToken(token));

    if (!usuario || !usuario.resetTokenHash || !usuario.resetTokenExpiraEm) {
      throw HttpError.badRequest('Token de recuperacao invalido ou ja utilizado.');
    }

    if (usuario.resetTokenExpiraEm.getTime() <= Date.now()) {
      // Token vencido: limpa para nao deixar residuo no registro.
      await this.repo.update(usuario.id, { resetTokenHash: null, resetTokenExpiraEm: null });
      throw HttpError.badRequest('Token de recuperacao expirado. Solicite um novo.');
    }

    if (!tokensIguais(hashToken(token), usuario.resetTokenHash)) {
      throw HttpError.badRequest('Token de recuperacao invalido ou ja utilizado.');
    }

    await this.repo.update(usuario.id, {
      senhaHash: await bcrypt.hash(novaSenha, env.bcryptSaltRounds),
      resetTokenHash: null,
      resetTokenExpiraEm: null,
    });
  }

  /** Usado pelo middleware de autenticacao para carregar o usuario do token. */
  async buscarPorId(id: string): Promise<PublicUser | null> {
    const usuario = await this.repo.findById(id);
    return usuario ? toPublicUser(usuario) : null;
  }

  private montarSessao(usuario: User): AuthResult {
    const payload: TokenPayload = {
      sub: usuario.id,
      email: usuario.email,
      nivelAcesso: usuario.nivelAcesso,
    };

    const token = jwt.sign(payload, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
      algorithm: 'HS256',
    });

    const decodificado = jwt.decode(token) as { exp?: number } | null;
    const expiraEm = decodificado?.exp
      ? decodificado.exp - Math.floor(Date.now() / 1000)
      : 0;

    return { usuario: toPublicUser(usuario), token, expiraEm };
  }
}

/** Guardamos o hash do token, nunca o token puro. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Comparacao em tempo constante entre dois hashes hex. */
function tokensIguais(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export const authService = new AuthService();
