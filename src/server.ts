import { criarApp } from './app';
import { env } from './config/env';

const app = criarApp();

const server = app.listen(env.port, () => {
  console.log(`[hygia-api] rodando em http://localhost:${env.port} (${env.nodeEnv})`);
});

/** Encerramento limpo para nao derrubar requisicoes em andamento no Docker. */
for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, () => {
    console.log(`[hygia-api] ${sinal} recebido, encerrando...`);
    server.close(() => process.exit(0));
  });
}
