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

function lerBooleano(nome: string, padrao: boolean): boolean {
  const bruto = process.env[nome]?.trim().toLowerCase();
  if (!bruto) return padrao;
  return bruto === 'true' || bruto === '1';
}

function lerTexto(nome: string): string | undefined {
  const valor = process.env[nome]?.trim();
  return valor ? valor : undefined;
}

/** Dialetos suportados. SQLite no desenvolvimento, Postgres em producao. */
const DIALETOS = ['sqlite', 'postgres'] as const;
type Dialeto = (typeof DIALETOS)[number];

function lerDialeto(): Dialeto {
  const bruto = (process.env.DB_DIALECT ?? 'sqlite').trim().toLowerCase();
  if (!(DIALETOS as readonly string[]).includes(bruto)) {
    throw new Error(`DB_DIALECT deve ser um de: ${DIALETOS.join(', ')} (recebido: "${bruto}").`);
  }
  return bruto as Dialeto;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProducao,
  port: lerInteiro('PORT', 3000),

  /** Endereco publico do front, usado para montar o link de redefinicao. */
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',

  jwtSecret: lerJwtSecret(),
  /** Aceita os formatos do jsonwebtoken: "15m", "2h", "7d" ou segundos. */
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? '2h') as SignOptions['expiresIn'],
  bcryptSaltRounds: lerInteiro('BCRYPT_SALT_ROUNDS', 10),
  resetTokenTtlMinutes: lerInteiro('RESET_TOKEN_TTL_MINUTES', 30),

  /** Origens liberadas no CORS (front-end). Separe varias por virgula. */
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean),

  /**
   * Quantos proxies a frente da API sao confiaveis (0 = nenhum).
   * Importante para o rate limit: com o valor errado, o Express le o IP errado
   * e um atacante consegue burlar o limite forjando o header X-Forwarded-For.
   */
  trustProxy: lerInteiro('TRUST_PROXY', 0) || 0,

  banco: {
    dialeto: lerDialeto(),
    /** Caminho do arquivo SQLite (ignorado nos demais dialetos). */
    storage: process.env.DB_STORAGE ?? './hygia.sqlite',
    host: process.env.DB_HOST ?? 'localhost',
    porta: lerInteiro('DB_PORT', 5432),
    nome: process.env.DB_NAME ?? 'hygia',
    usuario: process.env.DB_USER ?? 'postgres',
    senha: process.env.DB_PASSWORD ?? '',
    /** Loga o SQL gerado. Util para depurar, barulhento no dia a dia. */
    logging: lerBooleano('DB_LOGGING', false),
    /**
     * `sequelize.sync()` cria/ajusta as tabelas na subida. Comodo em
     * desenvolvimento; em producao o caminho correto sao migrations.
     */
    sincronizar: lerBooleano('DB_SYNC', !isProducao),
  },

  rateLimit: {
    /** Janela em minutos usada pelos limitadores. */
    janelaMinutos: lerInteiro('RATE_LIMIT_JANELA_MINUTOS', 15),
    /** Teto por IP em todas as rotas /auth somadas. */
    maxGeral: lerInteiro('RATE_LIMIT_MAX_GERAL', 40),
    /** Teto por IP nas tentativas de login (protecao contra forca bruta). */
    maxLogin: lerInteiro('RATE_LIMIT_MAX_LOGIN', 7),
    /** Teto por IP nos pedidos de recuperacao de senha. */
    maxRecuperacao: lerInteiro('RATE_LIMIT_MAX_RECUPERACAO', 5),
    /** Teto por IP na criacao de contas. */
    maxCadastro: lerInteiro('RATE_LIMIT_MAX_CADASTRO', 10),
  },

  email: {
    remetente: process.env.MAIL_FROM ?? 'Hygia Software <nao-responda@hygia.local>',
    host: lerTexto('SMTP_HOST'),
    porta: lerInteiro('SMTP_PORT', 587),
    seguro: lerBooleano('SMTP_SECURE', false),
    usuario: lerTexto('SMTP_USER'),
    senha: lerTexto('SMTP_PASSWORD'),
  },
} as const;

/** Ha SMTP proprio configurado? Sem isso, o ambiente de dev cai no Ethereal. */
export const temSmtpConfigurado = Boolean(env.email.host);
