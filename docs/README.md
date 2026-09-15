# Documentação do Hygia Software

Esta pasta guarda a documentação técnica do projeto: como o sistema é
organizado, como o banco é modelado e — principalmente — **por que** cada
decisão foi tomada.

## Visão do produto

O Hygia Software é um ecossistema SaaS voltado para corretores de seguros. O
escopo final prevê seis módulos:

| Módulo | Situação |
| --- | --- |
| CRM | **Em desenvolvimento (MVP / Beta)** |
| Chatbot | Planejado |
| E-mail marketing | Planejado |
| Simulador de cálculos | Planejado |
| Controle de comissões | Planejado |
| Assistente virtual | Planejado |

O foco atual é colocar o **CRM** em uma versão Beta utilizável o quanto antes,
para que uma corretora experiente use no dia a dia e devolva feedback real.

## Stack

- **Backend:** Node.js, Express 5, TypeScript
- **Banco:** SQLite via Sequelize (preparado para PostgreSQL)
- **Frontend:** React 19 com Vite, estilizado com Tailwind CSS v4
- **Identidade visual:** fundo neutro escuro, dourado metalico, fonte Montserrat

## Índice

- [Decisões de arquitetura (ADRs)](decisoes/) — o registro do "porquê"
  - [0001 — Tailwind CSS no lugar de CSS puro](decisoes/0001-tailwind-css.md)
  - [0002 — Paleta escura com dourado metalico e Montserrat](decisoes/0002-paleta-premium.md)
  - [0003 — Corrigir o asset da logo em vez de compensar no CSS](decisoes/0003-logo-transparente.md)
  - [0004 — "Manter-me conectado": sessao de 30 dias](decisoes/0004-manter-me-conectado.md)
- [Registros de segurança](seguranca/) — falhas encontradas, como foram corrigidas e o que se aprendeu
  - [14/09/2026 — Escalada de privilégio no cadastro público](seguranca/2026-09-14-escalada-de-privilegio-no-cadastro.md)

### A escrever

Estes documentos entram nas próximas etapas, conforme o trabalho avança:

- `arquitetura.md` — camadas do backend, fluxo de uma requisição, como um novo
  módulo se encaixa
- `banco-de-dados.md` — tabelas, colunas, relacionamentos e o raciocínio por
  trás do modelo
- `fluxos/autenticacao.md` — cadastro, login, recuperação de senha e revogação
  de sessão, passo a passo

## Como usar estes documentos no TCC

Cada ADR (Architecture Decision Record) segue sempre a mesma estrutura:
**contexto → decisão → consequências**. Esse formato é o que a bibliografia de
engenharia de software recomenda para registrar decisões, e serve diretamente
como material de capítulo: o contexto vira a justificativa, a decisão vira o
método, e as consequências viram a análise crítica.
