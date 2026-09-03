# Hygia-software
Projeto em equipe

## API de autenticacao (backend)

Backend em TypeScript + Express 5. Estrutura em `src/`:

```
src/
├── config/env.ts                  # variaveis de ambiente validadas na inicializacao
├── types/user.ts                  # User, NivelAcesso, PublicUser, TokenPayload
├── types/express.d.ts             # tipagem de req.usuario
├── utils/validators.ts            # validacao dos corpos de requisicao
├── utils/httpError.ts             # erro de dominio com status HTTP
├── repositories/userRepository.ts # persistencia (hoje em memoria)
├── services/authService.ts        # regras de negocio: hash, JWT, tokens de reset
├── controllers/authController.ts  # entrada/saida HTTP
├── middlewares/                   # authMiddleware, exigirNivel, errorHandler
├── routes/authRoutes.ts           # /auth/*
├── app.ts                         # monta o Express (testavel)
└── server.ts                      # sobe o servidor
```

### Como rodar

```bash
cp .env.example .env
npm install
npm run dev
```

Scripts: `npm run dev` (hot reload), `npm run build`, `npm start`, `npm run typecheck`.

### Endpoints

| Metodo | Rota                    | Corpo                                | Resposta                        |
| ------ | ----------------------- | ------------------------------------ | ------------------------------- |
| POST   | `/auth/register`        | `nome`, `email`, `senha`, `nivelAcesso?` | `201` usuario + token JWT   |
| POST   | `/auth/login`           | `email`, `senha`                     | `200` usuario + token JWT       |
| POST   | `/auth/forgot-password` | `email`                              | `200` mensagem generica         |
| POST   | `/auth/reset-password`  | `token`, `novaSenha`                 | `200` mensagem de confirmacao   |
| GET    | `/auth/me`              | header `Authorization: Bearer <jwt>` | `200` usuario da sessao         |
| GET    | `/health`               | -                                    | `200` status do servico         |

Erros seguem o formato `{ "erro": "mensagem", "detalhes": { "campo": "motivo" } }`.

### Decisoes de seguranca

- Senha guardada apenas como hash bcrypt (custo configuravel em `BCRYPT_SALT_ROUNDS`).
- Login responde a mesma mensagem para e-mail inexistente e senha errada, e sempre
  executa uma comparacao bcrypt, para nao revelar quais e-mails estao cadastrados.
- `/auth/forgot-password` responde igual exista ou nao a conta. O token de
  recuperacao e aleatorio (32 bytes), tem validade curta e e salvo apenas como
  hash SHA-256 - o valor puro so trafega no link enviado ao usuario.
- Em desenvolvimento o `resetToken` volta na resposta para permitir testar o fluxo
  sem servico de e-mail. Em producao (`NODE_ENV=production`) ele nunca e devolvido.
- A aplicacao se recusa a subir em producao sem `JWT_SECRET` proprio.

### Pendencias conhecidas

- Persistencia em memoria: os dados somem ao reiniciar. Trocar a instancia
  exportada em `src/repositories/userRepository.ts` quando o banco entrar.
- Envio de e-mail de recuperacao ainda nao integrado (ver TODO em `authService`).
- Sem rate limit nas rotas de autenticacao (recomendado antes de ir para producao).
- JWT sem lista de revogacao: um token emitido antes de uma troca de senha
  continua valido ate expirar.
