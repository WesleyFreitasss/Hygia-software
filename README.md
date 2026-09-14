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
| POST   | `/auth/register`        | `nome`, `email`, `senha`                 | `201` vendedor + token JWT    |
| POST   | `/auth/login`           | `email`, `senha`, `lembrarMe?`           | `200` usuario + token JWT     |
| POST   | `/auth/forgot-password` | `email`                                  | `200` mensagem generica       |
| POST   | `/auth/reset-password`  | `token`, `novaSenha`                     | `200` mensagem de confirmacao |
| GET    | `/auth/me`              | header `Authorization: Bearer <jwt>`     | `200` usuario da sessao       |
| GET    | `/health`               | -                                        | `200` status do servico       |

Erros seguem o formato `{ "erro": "mensagem", "detalhes": { "campo": "motivo" } }`.

`lembrarMe: true` no login emite um token de 30 dias em vez de 2 horas - e o
checkbox "Manter-me conectado" da tela. Motivo e limites em
[docs/decisoes/0004](docs/decisoes/0004-manter-me-conectado.md).

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

- O cadastro publico **nunca** define privilegio: informar `nivelAcesso` gera
  400, e o servidor fixa o papel como `vendedor`. Corrigido apos uma escalada de
  privilegio encontrada em auditoria - ver
  [docs/seguranca](docs/seguranca/2026-09-14-escalada-de-privilegio-no-cadastro.md).
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

Tela de login em React + Vite, estilizada com **Tailwind CSS v4**. Nao ha mais
nenhum arquivo de CSS por tela: a identidade visual vive nos tokens do tema.

```
index.html               # entrada do Vite
vite.config.mjs          # plugin do Tailwind + build do front em dist-web/
public/logo-hygia.png    # brasao (512x512, com transparencia)
scripts/gerar-logo.js    # regera o brasao a partir do arquivo original
src/main.jsx             # importa fonte + CSS global e monta o <Login />
src/styles/global.css    # Tailwind, paleta da marca (@theme) e regras base
src/login.jsx            # tela de login (100% Tailwind)
```

A fonte Montserrat e servida pela propria aplicacao (`@fontsource/montserrat`),
sem depender do Google Fonts. Os icones vem do `lucide-react`.

`npm run dev:web` sobe o front em http://localhost:5173 - rode junto com `npm run dev` (API).
O endereco da API vem de `VITE_API_URL` e cai em `http://localhost:3000` por padrao.
O backend libera CORS para as origens de `CORS_ORIGIN`.

Ao autenticar, o token vai para o `localStorage` na chave `hygia:token` e o usuario
em `hygia:usuario` (constantes exportadas por `src/login.jsx`).

O componente aceita as props `logoSrc`, `onSucesso`, `onIrParaCadastro` e
`onIrParaRecuperarSenha` - os ganchos para quando o roteador entrar.

### Pendencias conhecidas

- Nenhuma rota cria administrador hoje (efeito intencional da correcao de
  seguranca). O Administrador Master nasce junto com a corretora no Card 1.
- Sem migrations: hoje o schema vem de `sequelize.sync({ alter: true })`. Antes
  de ir para producao, gere migrations com `sequelize-cli` e desligue `DB_SYNC`.
- Rate limit em memoria: nao serve para varias instancias (ver secao acima).
- Telas de cadastro e de recuperacao de senha ainda nao existem: os links da tela
  de login chamam callbacks vazios ate o roteador entrar.
- O token fica no localStorage (simples, mas visivel a XSS). Cookie httpOnly e a
  alternativa mais segura quando o time quiser endurecer isso - e ganhou peso
  agora que "Manter-me conectado" cria sessoes de 30 dias.
- Nao ha "encerrar sessao em todos os dispositivos" na interface. O backend ja
  sabe fazer isso (incrementar `tokenVersion`), falta a tela.
- Os componentes reutilizaveis (Botao, CampoTexto, Alerta) ainda nao foram
  extraidos: as classes repetidas estao nomeadas no topo de `src/login.jsx`
  esperando a segunda tela do CRM aparecer para justificar a extracao.
- ~~`public/logo-hygia.png` tem 1,24 MB~~ **resolvido**: hoje sao 512x512 com
  transparencia real, 349 KB. Regerar com `node scripts/gerar-logo.js`.
- Sem testes automatizados: a validacao ate aqui foi manual. O `app.ts` ja e
  separado do `server.ts` justamente para permitir testes com vitest/supertest.
