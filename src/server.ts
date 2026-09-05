import { criarApp } from './app';
import { conectarBanco, desconectarBanco } from './config/database';
import { env } from './config/env';

/**
 * O banco abre antes do servidor aceitar conexoes: subir a API com o banco
 * fora do ar so adiaria o erro para a primeira requisicao do usuario.
 */
async function main(): Promise<void> {
  await conectarBanco();

  const app = criarApp();
  const server = app.listen(env.port, () => {
    console.log(`[hygia-api] rodando em http://localhost:${env.port} (${env.nodeEnv})`);
  });

  /** Encerramento limpo para nao derrubar requisicoes em andamento no Docker. */
  for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sinal, () => {
      console.log(`[hygia-api] ${sinal} recebido, encerrando...`);
      server.close(async () => {
        await desconectarBanco().catch(() => undefined);
        process.exit(0);
      });
    });
  }
}

main().catch((erro) => {
  console.error('[hygia-api] falha ao iniciar:', erro);
  process.exit(1);
});
