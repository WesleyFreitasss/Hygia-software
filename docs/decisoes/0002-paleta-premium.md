# ADR 0002 — Paleta escura com dourado metálico e tipografia Montserrat

- **Data:** 09/09/2026
- **Situação:** Aceita
- **Etapa do projeto:** preparação do CRM Beta
- **Depende de:** [ADR 0001 — Tailwind CSS](0001-tailwind-css.md)

## Contexto

A primeira versão da tela de login usava fundo azul-marinho (`#060911`) com um
halo radial azulado. O resultado ficou tecnicamente correto, mas genérico — azul
escuro é o padrão visual de praticamente todo painel administrativo e todo
sistema de gestão do mercado.

Isso é um problema de produto, não de estética. O usuário final do Hygia é um
**corretor de seguros**, e o produto será usado na frente do cliente dele. A
interface precisa comunicar duas coisas ao mesmo tempo:

1. **Confiança e seriedade** — seguro é um produto de risco e de longo prazo. A
   interface não pode parecer improvisada.
2. **Sofisticação** — o corretor precisa sentir que usa uma ferramenta
   profissional cara, não uma planilha com botões.

A referência visual aprovada pelo Product Manager é um cartão de login escuro,
quase preto, com o brasão dourado da marca em destaque e acabamentos metálicos.

## Decisão

Adotar uma paleta **neutra escura com dourado metálico** e a tipografia
**Montserrat** como identidade visual de todo o produto.

### Por que preto/cinza neutro em vez de azul

- Azul escuro virou o "cinza corporativo" da nossa década: comunica *software*,
  não comunica *marca*. Um neutro escuro não compete com nenhum outro elemento.
- O dourado da marca só rende contraste real sobre fundo neutro. Sobre azul, o
  ouro puxa para o esverdeado, porque azul e amarelo são complementares.
- Fundo neutro deixa a logo — que já é dourada — ser o único ponto de cor da
  tela. Toda a atenção vai para a marca.

O tom escolhido, `#161618`, é levemente **quente**: o canal vermelho é maior que
o azul. Isso não é acidente. Um cinza frio devolveria justamente a sensação de
azul que estamos removendo.

### Por que dourado, e não prata ou verde

Ouro carrega associação cultural direta com **valor, garantia e patrimônio** —
exatamente o vocabulário do mercado de seguros. E, diferente de uma cor chapada,
o ouro tratado como *metal* (com gradiente e reflexo) transmite acabamento caro,
que é o efeito buscado.

Por isso o botão principal nunca usa cor sólida: usa um gradiente que vai do
escuro ao brilho e volta ao escuro, imitando luz correndo sobre metal polido.

### Por que Montserrat

- É uma *geométrica sem serifa*: formas construídas a partir de círculos e
  linhas retas. Esse desenho passa precisão e ordem — bom para dados, valores e
  formulários, que é do que o CRM é feito.
- Aguenta bem espaçamento entre letras (`tracking`). Títulos em caixa alta e
  espaçados são um recurso clássico de identidade premium, e a Montserrat
  suporta esse tratamento sem fechar os contornos.
- É gratuita e tem a família completa de pesos (100 a 900), o que dá margem
  para hierarquia tipográfica sem trocar de fonte.

## A paleta

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-gold-light` | `#f3e5ab` | brilho / reflexo no gradiente metálico |
| `--color-gold` | `#d4af37` | dourado cheio: botão, detalhes da logo |
| `--color-gold-muted` | `#c5a059` | dourado opaco: títulos, bordas, links |
| `--color-gold-dark` | `#aa7c11` | sombra do metal, base do gradiente |
| `--color-ink` | `#161618` | fundo da aplicação |
| `--color-ink-soft` | `#1f1f22` | halo suave atrás da logo |
| `--color-ink-deep` | `#0a0a0b` | fundo dos campos de formulário |
| `--color-cream` | `#e8e3d9` | texto principal |
| `--color-cream-soft` | `#a8a29a` | texto secundário, rótulos |
| `--color-danger` | `#ff8a80` | mensagens de erro |

Os demais níveis de escuro (cartão, separadores) saem da escala `neutral` que o
Tailwind já traz pronta — não faz sentido duplicar o que a ferramenta oferece.

### Uma hierarquia de dourados, não um dourado só

Um detalhe que sustenta a sensação de "premium": existem **quatro** dourados, e
cada um tem função definida. Texto usa o dourado opaco (`gold-muted`), que é
legível; o dourado cheio e o brilho ficam reservados para superfícies metálicas.

Usar o dourado mais brilhante em texto corrido produziria o efeito oposto do
pretendido: leitura cansativa e aparência de banner de promoção.

## Consequências

### A favor

- A identidade fica declarada em um único bloco `@theme`. Ajustar o tom do ouro
  no produto inteiro é mudar uma linha.
- Todos os tokens viram classes automaticamente (`bg-gold`, `text-gold-muted`,
  `border-gold-dark`), então as próximas telas do CRM já nascem na identidade.
- Como a fonte foi definida via `--font-sans`, a Montserrat vale para o projeto
  inteiro sem precisar de classe em cada elemento.

### Contra (e como lidamos)

- **A fonte não vem do Google Fonts.** A primeira versão carregava a Montserrat
  por `<link>` do Google. Isso tinha dois problemas: se a rede do usuário
  bloqueasse `fonts.googleapis.com`, o texto caía para a pilha reserva **em
  silêncio**, sem erro no console; e cada visita enviava o IP do usuário para
  servidores do Google, o que é um ponto de atenção de LGPD.
  Decisão: a fonte é instalada como dependência (`@fontsource/montserrat`) e
  importada em `src/main.jsx`. O Vite empacota os `.woff2` junto do build, então
  ela viaja com a aplicação e não depende de nada externo.
- **Contraste exige atenção.** Dourado sobre preto passa nos critérios de
  acessibilidade; dourado sobre dourado, não.
  Mitigação: o `gold-muted` existe justamente para texto, e o `gold-light` fica
  restrito a superfície metálica.

### O problema que apareceu na implementação

Ao aplicar a Montserrat, a fonte **não pegou**: o `body` continuou em Segoe UI.

A causa foi o mesmo mecanismo de camadas descrito no ADR 0001, agora jogando
contra. O `src/login.css` tinha um bloco `body` com `font-family` próprio e, por
ser CSS **fora de camada**, vencia a regra global que está em `@layer base`.

A correção foi remover esse bloco do `login.css`. Fundo, cor, fonte e
antialiasing agora vivem em um único lugar: `src/styles/global.css`.

A lição vale registrar para o TCC: **camadas de CSS resolvem o conflito entre a
biblioteca e o seu código, mas não resolvem conflito entre dois arquivos seus.**
Para esse caso, o que vale continua sendo a disciplina de não declarar a mesma
propriedade em dois lugares.

## Arquivos afetados

| Arquivo | O que mudou |
| --- | --- |
| `index.html` | comentário apontando para o pacote da fonte (sem `<link>` externo) |
| `src/main.jsx` | importa os pesos 400/500/600/700 da Montserrat |
| `package.json` | + `@fontsource/montserrat` |
| `src/styles/global.css` | paleta dourada/neutra e `--font-sans` |
| `src/login.css` | azuis removidos, dourados alinhados, bloco `body` removido |
| `src/login.jsx` | selo temporário usando os tokens novos |

## Como isso foi verificado

- `getComputedStyle(document.body).fontFamily` retornou `Montserrat` à frente da
  pilha; os arquivos `montserrat-latin-*.woff2` foram servidos pela própria
  aplicação e nenhuma requisição saiu para o Google.
- Fundo do `body` medido em `rgb(22, 22, 24)` — o `#161618` pretendido.
- Nenhuma referência a azul restante em `src/`: o halo radial passou de
  `rgba(24, 36, 64, ...)` para `rgba(58, 54, 48, ...)`.
