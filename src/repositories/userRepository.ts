import { randomUUID } from 'node:crypto';
import type { NivelAcesso, User } from '../types/user';

/**
 * Contrato de persistencia de usuarios.
 *
 * A implementacao atual e em memoria (o projeto ainda nao tem banco).
 * Quando o banco entrar, basta criar outra classe que implemente esta
 * interface e trocar a instancia exportada no final do arquivo - services,
 * controllers e rotas nao mudam.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /** Busca pelo hash do token de recuperacao (o token puro nunca e salvo). */
  findByResetTokenHash(tokenHash: string): Promise<User | null>;
  create(dados: Omit<User, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<User>;
  update(id: string, dados: Partial<Omit<User, 'id' | 'criadoEm'>>): Promise<User>;
}

export class InMemoryUserRepository implements UserRepository {
  /** Chave: id do usuario. */
  private readonly usuarios = new Map<string, User>();
  /** Indice email normalizado -> id, para busca de login em O(1). */
  private readonly indicePorEmail = new Map<string, string>();

  async findByEmail(email: string): Promise<User | null> {
    const id = this.indicePorEmail.get(email.toLowerCase());
    if (!id) return null;
    return this.clonar(this.usuarios.get(id));
  }

  async findById(id: string): Promise<User | null> {
    return this.clonar(this.usuarios.get(id));
  }

  async findByResetTokenHash(tokenHash: string): Promise<User | null> {
    for (const usuario of this.usuarios.values()) {
      if (usuario.resetTokenHash === tokenHash) return this.clonar(usuario);
    }
    return null;
  }

  async create(dados: Omit<User, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<User> {
    const agora = new Date();
    const usuario: User = { ...dados, id: randomUUID(), criadoEm: agora, atualizadoEm: agora };

    this.usuarios.set(usuario.id, usuario);
    this.indicePorEmail.set(usuario.email, usuario.id);

    return this.clonar(usuario)!;
  }

  async update(id: string, dados: Partial<Omit<User, 'id' | 'criadoEm'>>): Promise<User> {
    const atual = this.usuarios.get(id);
    if (!atual) throw new Error(`Usuario ${id} nao encontrado.`);

    const atualizado: User = { ...atual, ...dados, id: atual.id, atualizadoEm: new Date() };

    if (dados.email && dados.email !== atual.email) {
      this.indicePorEmail.delete(atual.email);
      this.indicePorEmail.set(atualizado.email, id);
    }
    this.usuarios.set(id, atualizado);

    return this.clonar(atualizado)!;
  }

  /** Devolve copia para que quem chamou nao mute o "banco" por referencia. */
  private clonar(usuario: User | undefined): User | null {
    return usuario ? { ...usuario } : null;
  }

  /** Util em testes. */
  async limpar(): Promise<void> {
    this.usuarios.clear();
    this.indicePorEmail.clear();
  }
}

/** Instancia usada pela aplicacao. Troque aqui ao plugar o banco real. */
export const userRepository: UserRepository = new InMemoryUserRepository();

/** Nivel de acesso padrao de quem se cadastra pela tela publica. */
export const NIVEL_ACESSO_PADRAO: NivelAcesso = 'vendedor';
