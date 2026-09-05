import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { HttpError } from '../utils/httpError';
import { NIVEL_ACESSO_PADRAO, userRepository, type UserRepository } from '../repositories/userRepository';
import { emailService } from './emailService';
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
   * Link do Ethereal para abrir o e-mail no navegador. So aparece fora de
   * producao: e uma comodidade de desenvolvimento, nao parte do contrato.
   */
  previewUrl?: string;
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
      tokenVersion: 0,
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
   * Gera um token de uso unico com validade curta e manda o link por e-mail.
   * Guardamos apenas o SHA-256 do token: se o banco vazar, os tokens em
   * transito continuam inuteis. A resposta e sempre a mesma, exista ou nao a
   * conta (evita enumeracao de e-mails cadastrados).
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

    try {
      const envio = await emailService.enviarRecuperacaoSenha(usuario.email, usuario.nome, resetToken);
      // Fora de producao devolvemos a previa para facilitar o teste manual.
      // O token puro nunca volta na resposta, em nenhum ambiente.
      if (!env.isProducao && envio.previewUrl) return { previewUrl: envio.previewUrl };
    } catch (erro) {
      // O e-mail falhou, mas a resposta continua generica: contar que houve
      // erro no envio ja denunciaria que a conta existe.
      console.error('[auth] falha ao enviar o e-mail de recuperacao:', erro);
    }

    return {};
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

    // Troca de senha encerra todas as sessoes: quem tinha um JWT antigo -
    // inclusive o invasor que motivou a troca - perde o acesso na hora.
    await this.repo.incrementarTokenVersion(usuario.id);
  }

  /**
   * Valida uma sessao ja autenticada pelo JWT.
   * Alem de conferir se o usuario ainda existe, compara a versao do token com
   * a do banco - e isso que faz a revogacao valer.
   */
  async validarSessao(payload: TokenPayload): Promise<PublicUser> {
    const usuario = await this.repo.findById(payload.sub);
    if (!usuario) throw HttpError.unauthorized('Sessao invalida.');

    if (usuario.tokenVersion !== payload.tokenVersion) {
      throw HttpError.unauthorized('Sessao encerrada porque a senha foi alterada. Faca login novamente.');
    }

    return toPublicUser(usuario);
  }

  private montarSessao(usuario: User): AuthResult {
    const payload: TokenPayload = {
      sub: usuario.id,
      email: usuario.email,
      nivelAcesso: usuario.nivelAcesso,
      tokenVersion: usuario.tokenVersion,
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
