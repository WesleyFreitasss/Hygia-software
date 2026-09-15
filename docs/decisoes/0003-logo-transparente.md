# ADR 0003 — Corrigir o asset da logo em vez de compensar no CSS

- **Data:** 09/09/2026
- **Situação:** Aceita
- **Etapa do projeto:** preparação do CRM Beta
- **Depende de:** [ADR 0002 — Paleta premium](0002-paleta-premium.md)

## Contexto

O arquivo `public/logo-hygia.png` entregue pelo Product Manager tinha 1229x864
pixels, 1,24 MB, e **não era um recorte**: o brasão vinha desenhado sobre uma
chapa cinza retangular, com uma marca d'água no canto inferior direito.

Para exibir só o brasão, o CSS acumulou três camadas de compensação:

1. `object-fit: cover` recortando o quadrado central (para descartar as sobras
   laterais e a marca d'água);
2. uma máscara radial dissolvendo a borda da chapa no fundo da tela;
3. `filter: brightness(0.88)` escurecendo a chapa até o tom do fundo.

Isso funcionou **enquanto o fundo era azul quase preto** (`#060911`). Quando a
paleta mudou para `#161618` (ADR 0002), a compensação quebrou e apareceu um
disco escuro visível atrás do brasão.

## Por que a compensação não tinha conserto

A chapa do PNG não é uma cor: é um **gradiente**, medido pixel a pixel:

| Ponto da chapa | Cor |
| --- | --- |
| Topo | `rgb(45, 46, 50)` |
| Canto superior esquerdo | `rgb(33, 34, 39)` |
| Meio esquerdo | `rgb(19, 18, 23)` |
| Base | `rgb(5, 6, 8)` |

O fundo novo, `rgb(22, 22, 24)`, cai **no meio dessa faixa**. Ou seja: nenhum
valor único de `brightness` poderia funcionar — clarear resolveria a base e
estouraria o topo; escurecer faria o inverso.

A segunda tentativa foi remover a chapa por luminância, com
`filter: contrast(1.6)` seguido de `mix-blend-mode: screen` (contraste empurra
os tons escuros para preto puro; `screen` torna preto transparente). A chapa
sumiu, mas apareceu um efeito colateral: as **sombras do anel dourado ficaram
avermelhadas**.

O motivo é instrutivo. Compare um pixel de cada:

| | R | G | B |
| --- | --- | --- | --- |
| Chapa (topo) | 45 | 46 | 50 |
| Ouro escuro do anel | 67 | 46 | 19 |

O canal azul do ouro escuro (19) é **menor** que o da chapa (50). Qualquer
operação que zere o azul da chapa zera também o do ouro — e o que sobra é
vermelho puro. Chapa e sombra do metal têm luminância praticamente igual: elas
são inseparáveis por brilho.

## Decisão

Parar de compensar no CSS e **corrigir o arquivo de imagem**, gerando um PNG com
transparência real.

### A chave certa: saturação, não brilho

O que separa chapa e ouro com folga não é o brilho, é a **saturação** —
`max(R,G,B) - min(R,G,B)`:

| | Saturação |
| --- | --- |
| Chapa (todos os pontos medidos) | 3 a 6 |
| Ouro escuro do anel | 48 |
| Brasão "H" | 67 |
| Anel iluminado | 85 |

A chapa é cinza *neutro*; o ouro é um tom *quente*. A separação é de quase dez
vezes — larga o bastante para ser segura.

O canal alfa passou a ser calculado por uma rampa suave sobre a saturação:
transparente abaixo de 10, opaco acima de 34. A rampa (em vez de um corte seco)
preserva o antisserrilhado nas bordas do metal.

### O que o script faz

`scripts/gerar-logo.js` executa três operações de uma vez:

1. **Recorta** o quadrado central de 864x864, descartando as sobras laterais e a
   marca d'água do canto.
2. **Reamostra** para 512x512 por média de área — resolução suficiente para
   exibição a ~250 px, inclusive em telas retina.
3. **Calcula o alfa** pela saturação, como descrito acima.

Resultado: **349 KB** contra 1,24 MB (72,6% menor), com 77,8% dos pixels
totalmente transparentes e 18,4% totalmente opacos.

A biblioteca usada é a `pngjs`: JavaScript puro, sem compilação nativa — não
adiciona etapa de build no Windows.

## Consequências

### A favor

- O CSS da logo caiu de doze linhas de acrobacia para duas: `object-fit` e um
  `drop-shadow` decorativo. Não há mais máscara, blend nem filtro de contraste.
- A logo passa a funcionar sobre **qualquer** fundo. Isso é pré-requisito para a
  próxima etapa, em que ela vai aparecer sobre o card translúcido.
- Resolve de uma vez a pendência de peso registrada no README.
- Uma mudança futura de paleta não quebra mais a logo.

### Contra (e como lidamos)

- **A arte original tem que ser preservada.** O arquivo de 1,24 MB foi mantido
  como `public/logo-hygia-original.png`. Ele não é usado pela aplicação; serve
  de fonte caso seja preciso regerar em outra resolução.
- **O recorte é irreversível a partir do arquivo novo.** Por isso o script está
  versionado em `scripts/gerar-logo.js`: basta rodá-lo de novo sobre o original
  para produzir outra variação.
- **Os limiares foram calibrados para esta arte.** Se a marca mudar, os valores
  `SAT_MIN` e `SAT_MAX` podem precisar de ajuste. Eles estão nomeados e
  comentados no topo do script justamente por isso.

## A lição, para o TCC

Este caso é um exemplo limpo de um princípio de engenharia: **corrigir o dado na
origem custa menos do que compensar o defeito em cada ponto de consumo.**

A compensação no CSS parecia mais barata — era "só um filtro". Mas ela criou um
acoplamento invisível entre a cor de fundo da aplicação e a aparência da logo.
Esse acoplamento não estava escrito em lugar nenhum, e cobrou o preço na
primeira vez que a paleta mudou. Se a logo fosse aparecer em mais três lugares
(card, cabeçalho do CRM, e-mail), o mesmo defeito seria recompensado três vezes.

Vale registrar também o método: as duas primeiras tentativas foram descartadas
**com base em medição** — os valores RGB foram amostrados do arquivo antes de
decidir. Sem medir, a conclusão provável seria "ficou estranho, vou tentar outro
valor de brilho", em um ciclo de tentativa e erro sem fim.

## Arquivos afetados

| Arquivo | O que mudou |
| --- | --- |
| `public/logo-hygia.png` | **substituído** — 512x512, com transparência, 349 KB |
| `public/logo-hygia-original.png` | **novo** — a arte original preservada |
| `scripts/gerar-logo.js` | **novo** — regenera o recorte a partir do original |
| `src/login.css` | máscara, blend e filtros removidos |
| `src/login.jsx` | atributos `width`/`height` atualizados para 512 |
| `package.json` | + `pngjs` (devDependency) |

## Como isso foi verificado

- O script reportou 77,8% de pixels transparentes e 18,4% opacos — proporção
  compatível com um brasão circular dentro de um quadrado.
- Tela recarregada: o disco escuro desapareceu e as sombras do anel voltaram ao
  tom de bronze original, sem o desvio avermelhado.
