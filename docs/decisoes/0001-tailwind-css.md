# ADR 0001 — Tailwind CSS no lugar de CSS puro

- **Data:** 09/09/2026
- **Situação:** Aceita
- **Etapa do projeto:** preparação do CRM Beta

## Contexto

A tela de login foi construída com CSS puro em `src/login.css`: cerca de 280
linhas, com nomes de classe próprios (`.login-campo`, `.login-botao`) e uma
paleta declarada em variáveis CSS.

Isso funcionou bem para **uma** tela. Só que o CRM Beta precisa de várias em
sequência — lista de clientes, cadastro de apólice, agenda, dashboard — e o
modelo de CSS puro cobra um preço que cresce com o número de telas:

1. **Batismo constante.** Cada elemento novo exige inventar um nome de classe.
   É trabalho mental que não produz interface.
2. **Ida e volta entre arquivos.** Para entender um componente é preciso ler o
   `.jsx` e o `.css` lado a lado.
3. **Divergência visual.** Nada impede que a próxima tela use `12px` de padding
   onde a anterior usou `14px`. Sem um sistema, a interface descola aos poucos.
4. **CSS que só cresce.** Remover uma tela raramente vem acompanhado da remoção
   do CSS dela, e o arquivo acumula regras mortas.

Como o objetivo declarado é **velocidade até o Beta na mão da usuária**, o
critério de escolha foi: o que reduz o tempo entre "decidi a tela" e "a tela
está no ar".

## Decisão

Adotar **Tailwind CSS v4** como forma padrão de estilizar o frontend.

Detalhes da adoção:

- Instalação via **plugin oficial do Vite** (`@tailwindcss/vite`), e não via
  PostCSS. Na v4 o plugin dispensa `tailwind.config.js` e `postcss.config.js` —
  dois arquivos a menos para manter.
- A paleta da marca fica em **um único lugar**: o bloco `@theme` de
  `src/styles/global.css`. Cada variável vira utilitário automaticamente
  (`--color-ouro` gera `bg-ouro`, `text-ouro`, `border-ouro`).
- O CSS existente (`src/login.css`) **continua funcionando** durante a
  transição. A migração é gradual, tela por tela, sem um "big bang".

### Por que a v4 e não a v3

A v3 exige `tailwind.config.js` + `postcss.config.js` e faz a varredura de
classes via configuração de `content`. A v4 detecta os arquivos sozinha, define
tema em CSS e compila de forma consideravelmente mais rápida. Para um projeto
que está começando agora, não há motivo para adotar a geração anterior.

## Consequências

### A favor

- Estilo escrito no mesmo lugar onde o componente é escrito: menos troca de
  contexto — o que importa bastante para o ritmo de trabalho deste projeto.
- Espaçamentos, tamanhos e cores saem de uma escala pronta, então as telas do
  CRM nascem coerentes entre si sem esforço de coordenação.
- O CSS final contém apenas as classes realmente usadas. Ele encolhe quando
  código é removido, em vez de crescer para sempre.
- A paleta centralizada permite reagir a um pedido do tipo "o dourado está forte
  demais" mudando uma linha, e não trinta arquivos.

### Contra (e como lidamos)

- **JSX fica mais verboso.** Um elemento pode acumular dez ou mais classes.
  Mitigação: quando um padrão se repetir (botão, campo, cartão), ele vira um
  componente React reutilizável — o lugar certo para essa repetição morar.
- **Curva de aprendizado dos nomes.** Exige decorar `px-4`, `gap-2`, `rounded-lg`.
  Mitigação: a extensão *Tailwind CSS IntelliSense* no VS Code autocompleta e
  mostra o CSS equivalente ao passar o mouse.
- **Dois sistemas convivendo durante a migração.** `login.css` e Tailwind ficam
  ativos ao mesmo tempo por algumas etapas.
  Mitigação: é temporário e proposital — migrar tudo de uma vez arriscaria
  quebrar a única tela pronta. O `login.css` é apagado ao final da migração.

### Detalhe técnico que evitou um problema

O reset do Tailwind (*preflight*) normalmente atropelaria estilos existentes —
ele zera margens, aparência de botões e de títulos. Isso **não** aconteceu aqui,
por causa de como as camadas do CSS funcionam: o preflight vive dentro de um
`@layer` e, pela especificação de CSS em cascata, **qualquer regra fora de
camada tem prioridade sobre regras dentro de camadas**. Como `login.css` é CSS
comum, sem camada, ele vence o preflight automaticamente.

Foi por isso que a instalação não exigiu nenhum ajuste na tela de login: ela
continuou pixel a pixel igual.

## Arquivos afetados

| Arquivo | O que mudou |
| --- | --- |
| `package.json` | + `tailwindcss` e `@tailwindcss/vite` (devDependencies) |
| `vite.config.mjs` | plugin `tailwindcss()` registrado |
| `src/styles/global.css` | **novo** — importa o Tailwind e define a paleta |
| `src/main.jsx` | importa o CSS global antes dos componentes |
| `src/login.jsx` | selo temporário de verificação (removido na próxima etapa) |

## Como isso foi verificado

- Tela de login aberta em `http://localhost:5173`: aparência idêntica à
  anterior, sem erros no console.
- Selo de teste renderizado com `border-ouro` e `bg-marinho-claro` — provando
  que tanto o Tailwind quanto os tokens da marca compilam.
- `npm run build:web` gerou o CSS de produção (11,5 kB, 3,45 kB comprimido).
