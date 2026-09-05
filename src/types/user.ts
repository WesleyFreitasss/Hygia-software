/**
 * Tipagem central do usuario do CRM Hygia.
 * Este arquivo e a fonte da verdade: model, repositorio, services e controllers
 * devem importar daqui em vez de redeclarar campos.
 */

/** Nivel de acesso dentro do CRM. */
export type NivelAcesso = 'admin' | 'vendedor';

export const NIVEIS_ACESSO: readonly NivelAcesso[] = ['admin', 'vendedor'];

/**
 * Usuario como ele existe na camada de persistencia.
 * A senha em texto puro nunca e armazenada - apenas `senhaHash` (bcrypt).
 */
export interface User {
  id: string;
  nome: string;
  /** Sempre normalizado em minusculas antes de persistir. */
  email: string;
  /** Hash bcrypt da senha. Nunca sai da camada de service. */
  senhaHash: string;
  nivelAcesso: NivelAcesso;
  /**
   * Versao da sessao. Todo JWT carrega o valor vigente no momento da emissao;
   * ao trocar a senha o numero e incrementado, o que invalida de uma vez todos
   * os tokens emitidos antes - mesmo os que ainda nao expiraram.
   */
  tokenVersion: number;
  criadoEm: Date;
  atualizadoEm: Date;
  /** Hash SHA-256 do token de recuperacao. Null quando nao ha fluxo ativo. */
  resetTokenHash: string | null;
  resetTokenExpiraEm: Date | null;
}

/** Projecao segura do usuario: o unico formato que pode ir para o cliente. */
export interface PublicUser {
  id: string;
  nome: string;
  email: string;
  nivelAcesso: NivelAcesso;
  criadoEm: Date;
}

/** Dados aceitos na criacao de um usuario (ja validados). */
export interface CreateUserInput {
  nome: string;
  email: string;
  senha: string;
  nivelAcesso?: NivelAcesso;
}

/** Conteudo assinado dentro do JWT de sessao. */
export interface TokenPayload {
  /** id do usuario (claim padrao `sub`). */
  sub: string;
  email: string;
  nivelAcesso: NivelAcesso;
  /** Confrontado com o valor do banco a cada requisicao autenticada. */
  tokenVersion: number;
}

/** Remove qualquer campo sensivel antes de devolver o usuario na resposta. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    nivelAcesso: user.nivelAcesso,
    criadoEm: user.criadoEm,
  };
}

export function isNivelAcesso(valor: unknown): valor is NivelAcesso {
  return typeof valor === 'string' && (NIVEIS_ACESSO as readonly string[]).includes(valor);
}
