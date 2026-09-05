import { Sequelize } from 'sequelize';

import { env } from './env';

/**
 * Instancia unica do Sequelize.
 *
 * SQLite atende o desenvolvimento (zero infraestrutura, arquivo local).
 * Para Postgres basta definir DB_DIALECT=postgres e as demais DB_* no .env -
 * o restante do codigo nao muda, porque tudo passa pelo repositorio.
 */
function criarSequelize(): Sequelize {
  const logging = env.banco.logging ? console.log : false;

  if (env.banco.dialeto === 'sqlite') {
    return new Sequelize({
      dialect: 'sqlite',
      storage: env.banco.storage,
      logging,
    });
  }

  // O driver do Postgres nao vem instalado: so entra quando o time migrar.
  try {
    require.resolve('pg');
  } catch {
    throw new Error(
      'DB_DIALECT=postgres exige o driver do Postgres. Rode: npm install pg pg-hstore',
    );
  }

  return new Sequelize(env.banco.nome, env.banco.usuario, env.banco.senha, {
    dialect: 'postgres',
    host: env.banco.host,
    port: env.banco.porta,
    logging,
    pool: { max: 10, min: 0, idle: 10_000 },
  });
}

export const sequelize = criarSequelize();

/**
 * Abre a conexao e prepara o schema. Deve rodar antes do servidor aceitar
 * requisicoes - subir a API com o banco fora do ar so adia o erro.
 */
export async function conectarBanco(): Promise<void> {
  await sequelize.authenticate();

  if (env.banco.sincronizar) {
    // `alter` acerta colunas novas sem apagar dados. Em producao use migrations.
    await sequelize.sync({ alter: true });
  }

  const alvo = env.banco.dialeto === 'sqlite' ? env.banco.storage : `${env.banco.host}/${env.banco.nome}`;
  console.log(`[hygia-api] banco conectado (${env.banco.dialeto}: ${alvo})`);
}

export async function desconectarBanco(): Promise<void> {
  await sequelize.close();
}
