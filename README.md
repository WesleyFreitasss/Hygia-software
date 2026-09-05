# Hygia-software
Projeto em equipe

## API de autenticacao (backend)

Backend em TypeScript + Express 5, com Sequelize sobre SQLite (desenvolvimento)
ou PostgreSQL (producao). Estrutura em `src/`:

```
src/
├── config/env.ts                  # variaveis de ambiente validadas na inicializacao
├── config/database.ts             # instancia do Sequelize e abertura da conexao
├── models/usuario.ts              # model Sequelize (tabela `usuarios`)
├── types/user.ts                  # User, NivelAcesso, PublicUser, TokenPayload
├── types/express.d.ts             # tipagem de req.usuario / req.usuarioAutenticado
├── utils/validators.ts            # validacao dos corpos de requisicao (inclui regex de e-mail)
├── utils/httpError.ts             # erro de dominio com status HTTP
├── repositories/userRepository.ts # persistencia atras de uma interface
├── services/authService.ts        # regras: hash, JWT, tokens de reset, revogacao
├── services/emailService.ts       # nodemailer (SMTP real, Ethereal ou console)
├── controllers/authController.ts  # entrada/saida HTTP
├── middlewares/                   # authMiddleware, exigirNivel, rateLimit, errorHandler
├── routes/authRoutes.ts           # /auth/*
├── app.ts                         # monta o Express (testavel)
└── server.ts                      # abre o banco e sobe o servidor
```

### Como rodar

```bash
cp .env.example .env
npm install
npm run dev
```

O SQLite cria o arquivo `hygia.sqlite` sozinho na primeira subida - nao ha
nenhum banco para instalar. Scripts: `npm run dev` (hot reload), `npm run build`,
`npm start`, `npm run typecheck`.

### Banco de dados

`DB_DIALECT=sqlite` (padrao) usa um arquivo local. Para migrar para PostgreSQL:

```bash
npm install pg pg-hstore
```

e no `.env`: `DB_DIALECT=postgres` mais as demais `DB_*`. Nenhum outro arquivo
muda - services e controllers falam apenas com a interface `UserRepository`.

`DB_SYNC=true` deixa o Sequelize criar/ajustar as tabelas na subida, o que e
comodo em desenvolvimento. Em producao o caminho correto sao migrations
(`sequelize-cli`), com `DB_SYNC=false`.

### Endpoints

| Metodo | Rota                    | Corpo                                    | Resposta                      |
| ------ | ----------------------- | ---------------------------------------- | ----------------------------- |
| POST   | `/auth/register`        | `nome`, `email`, `senha`, `nivelAcesso?` | `201` usuario + token JWT     |
| POST   | `/auth/login`           | `email`, `senha`                         | `200` usuario + token JWT     |
| POST   | `/auth/forgot-password` | `email`                                  | `200` mensagem generica       |
| POST   | `/auth/reset-password`  | `token`, `novaSenha`                     | `200` mensagem de confirmacao |
| GET    | `/auth/me`              | header `Authorization: Bearer <jwt>`     | `200` usuario da sessao       |
| GET    | `/health`               | -                                        | `200` status do servico       |

Erros seguem o formato `{ "erro": "mensagem", "detalhes": { "campo": "motivo" } }`.

### Rate limit

Contagem por IP, em memoria, nas rotas de `/auth` (ajustavel por `RATE_LIMIT_*`):

| Grupo                   | Padrao | Janela  |
| ----------------------- | ------ | ------- |
| Login                   | 7      | 15 min  |
| Recuperacao de senha    | 5      | 15 min  |
| Cadastro                | 10     | 15 min  |
| Teto geral de `/auth`   | 40     | 15 min  |

Estourado o limite, a API responde `429` no mesmo formato dos demais erros.

Dois cuidados: rodando em mais de uma instancia, cada processo conta em separado
(troque por um store no Redis); e atras de proxy, ajuste `TRUST_PROXY` para o
numero real de saltos - com o valor errado o limite conta o IP do proxy, ou pior,
um IP que o cliente pode forjar.

### E-mail de recuperacao

Escolhido automaticamente, nesta ordem:

1. `SMTP_HOST` definido -> usa o servidor informado no `.env`;
2. desenvolvimento sem SMTP -> cria uma conta descartavel no **Ethereal Email** e
   devolve em `previewUrl` um link para abrir a mensagem no navegador;
3. Ethereal fora do ar (sem rede) -> registra o link no console e segue, em vez
   de derrubar o fluxo de recuperacao.

Em producao, subir sem `SMTP_HOST` e erro - a API falha alto em vez de fingir
que a mensagem saiu.

### Decisoes de seguranca

- Senha guardada apenas como hash bcrypt (custo em `BCRYPT_SALT_ROUNDS`).
- Login responde a mesma mensagem para e-mail inexistente e senha errada, e sempre
  executa uma comparacao bcrypt, para nao revelar quais e-mails estao cadastrados.
- E-mail validado por regex rigorosa (RFC 5322 na pratica) mais os limites de
  tamanho do RFC 5321, tanto no cadastro quanto no login.
- `/auth/forgot-password` responde igual exista ou nao a conta - inclusive quando
  o envio do e-mail falha. O token de recuperacao e aleatorio (32 bytes), tem
  validade curta e e salvo apenas como hash SHA-256; o valor puro so trafega no
  link enviado por e-mail, e nunca volta no corpo da resposta.
- **Revogacao de JWT**: cada usuario tem um `tokenVersion` no banco, que vai
  assinado dentro do token. Trocar a senha incrementa esse numero, e toda
  requisicao autenticada compara o valor do token com o do banco - entao todos os
  tokens emitidos antes param de funcionar na hora, mesmo sem terem expirado.
  O custo e uma leitura por requisicao autenticada.
- A aplicacao se recusa a subir em producao sem `JWT_SECRET` proprio.

## Front-end

Tela de login em React + Vite, com CSS puro (o projeto nao tem Tailwind configurado).

```
index.html            # entrada do Vite
vite.config.mjs       # build do front sai em dist-web/
public/logo-hygia.png # brasao servido em /logo-hygia.png
src/main.jsx          # monta o <Login />
src/login.jsx         # tela de login
src/login.css         # estilo escuro + dourado
```

`npm run dev:web` sobe o front em http://localhost:5173 - rode junto com `npm run dev` (API).
O endereco da API vem de `VITE_API_URL` e cai em `http://localhost:3000` por padrao.
O backend libera CORS para as origens de `CORS_ORIGIN`.

Ao autenticar, o token vai para o `localStorage` na chave `hygia:token` e o usuario
em `hygia:usuario` (constantes exportadas por `src/login.jsx`).

O componente aceita as props `logoSrc`, `onSucesso`, `onIrParaCadastro` e
`onIrParaRecuperarSenha` - os ganchos para quando o roteador entrar.

### Pendencias conhecidas

- Sem migrations: hoje o schema vem de `sequelize.sync({ alter: true })`. Antes
  de ir para producao, gere migrations com `sequelize-cli` e desligue `DB_SYNC`.
- Rate limit em memoria: nao serve para varias instancias (ver secao acima).
- Telas de cadastro e de recuperacao de senha ainda nao existem: os links da tela
  de login chamam callbacks vazios ate o roteador entrar.
- O token fica no localStorage (simples, mas visivel a XSS). Cookie httpOnly e a
  alternativa mais segura quando o time quiser endurecer isso.
- `public/logo-hygia.png` tem 1,24 MB (1229x864) e e a maior parte do peso da
  tela. Vale exportar uma versao menor, ou em WebP, antes de ir para producao.
- Sem testes automatizados: a validacao ate aqui foi manual. O `app.ts` ja e
  separado do `server.ts` justamente para permitir testes com vitest/supertest.
