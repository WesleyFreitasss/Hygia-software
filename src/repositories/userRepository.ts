import { UsuarioModel } from '../models/usuario';
import type { NivelAcesso, User } from '../types/user';

/**
 * Contrato de persistencia de usuarios.
 *
 * Services e controllers dependem desta interface, nunca do Sequelize direto.
 * Trocar de banco (ou de ORM) e reescrever apenas a implementacao abaixo.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /** Busca pelo hash do token de recuperacao (o token puro nunca e salvo). */
  findByResetTokenHash(tokenHash: string): Promise<User | null>;
  create(dados: Omit<User, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<User>;
  update(id: string, dados: Partial<Omit<User, 'id' | 'criadoEm'>>): Promise<User>;
  /**
   * Incrementa a versao da sessao, derrubando todos os JWT ja emitidos.
   * Feito no banco (`increment`) para nao perder atualizacoes concorrentes.
   */
  incrementarTokenVersion(id: string): Promise<User>;
}

/** Converte o registro do Sequelize no tipo de dominio usado pela aplicacao. */
function paraDominio(registro: UsuarioModel): User {
  return {
    id: registro.id,
    nome: registro.nome,
    email: registro.email,
    senhaHash: registro.senhaHash,
    nivelAcesso: registro.nivelAcesso,
    tokenVersion: registro.tokenVersion,
    criadoEm: registro.criadoEm,
    atualizadoEm: registro.atualizadoEm,
    resetTokenHash: registro.resetTokenHash,
    resetTokenExpiraEm: registro.resetTokenExpiraEm,
  };
}

export class SequelizeUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const registro = await UsuarioModel.findOne({ where: { email: email.toLowerCase() } });
    return registro ? paraDominio(registro) : null;
  }

  async findById(id: string): Promise<User | null> {
    const registro = await UsuarioModel.findByPk(id);
    return registro ? paraDominio(registro) : null;
  }

  async findByResetTokenHash(tokenHash: string): Promise<User | null> {
    const registro = await UsuarioModel.findOne({ where: { resetTokenHash: tokenHash } });
    return registro ? paraDominio(registro) : null;
  }

  async create(dados: Omit<User, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<User> {
    const registro = await UsuarioModel.create({
      nome: dados.nome,
      email: dados.email.toLowerCase(),
      senhaHash: dados.senhaHash,
      nivelAcesso: dados.nivelAcesso,
      tokenVersion: dados.tokenVersion,
      resetTokenHash: dados.resetTokenHash,
      resetTokenExpiraEm: dados.resetTokenExpiraEm,
    });
    return paraDominio(registro);
  }

  async update(id: string, dados: Partial<Omit<User, 'id' | 'criadoEm'>>): Promise<User> {
    const registro = await UsuarioModel.findByPk(id);
    if (!registro) throw new Error(`Usuario ${id} nao encontrado.`);

    if (dados.email !== undefined) registro.email = dados.email.toLowerCase();
    if (dados.nome !== undefined) registro.nome = dados.nome;
    if (dados.senhaHash !== undefined) registro.senhaHash = dados.senhaHash;
    if (dados.nivelAcesso !== undefined) registro.nivelAcesso = dados.nivelAcesso;
    if (dados.tokenVersion !== undefined) registro.tokenVersion = dados.tokenVersion;
    if (dados.resetTokenHash !== undefined) registro.resetTokenHash = dados.resetTokenHash;
    if (dados.resetTokenExpiraEm !== undefined) registro.resetTokenExpiraEm = dados.resetTokenExpiraEm;

    await registro.save();
    return paraDominio(registro);
  }

  async incrementarTokenVersion(id: string): Promise<User> {
    const registro = await UsuarioModel.findByPk(id);
    if (!registro) throw new Error(`Usuario ${id} nao encontrado.`);

    await registro.increment('tokenVersion', { by: 1 });
    await registro.reload();

    return paraDominio(registro);
  }
}

/** Instancia usada pela aplicacao. */
export const userRepository: UserRepository = new SequelizeUserRepository();

/** Nivel de acesso padrao de quem se cadastra pela tela publica. */
export const NIVEL_ACESSO_PADRAO: NivelAcesso = 'vendedor';
