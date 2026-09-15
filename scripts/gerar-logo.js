/*
 * Gera public/logo-hygia.png (recortado, transparente e leve) a partir de
 * public/logo-hygia-original.png.
 *
 * Rode com:  node scripts/gerar-logo.js
 *
 * ---------------------------------------------------------------------------
 * Por que a transparencia e calculada pela SATURACAO e nao pelo brilho:
 *
 * A arte original vem sobre uma chapa cinza. Chapa e ouro tem luminancia
 * parecida - a chapa vai de rgb(5,6,8) a rgb(45,46,50), e o ouro escuro do anel
 * esta em rgb(67,46,19) - entao separar por brilho apagaria as sombras do metal
 * junto com o fundo.
 *
 * Ja a saturacao, max(r,g,b) - min(r,g,b), separa os dois com folga:
 *     chapa -> 3 a 6    (cinza neutro)
 *     ouro  -> 48 a 85  (tom quente)
 *
 * Detalhes e medicoes em docs/decisoes/0003-logo-transparente.md.
 * ---------------------------------------------------------------------------
 */
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const PUBLICO = path.join(__dirname, '..', 'public');
const ENTRADA = path.join(PUBLICO, 'logo-hygia-original.png');
const SAIDA = path.join(PUBLICO, 'logo-hygia.png');

/** Lado do arquivo final. 512 cobre exibicao a ~250px, inclusive em retina. */
const LADO_FINAL = 512;

/** Rampa do alfa: abaixo de SAT_MIN e chapa; acima de SAT_MAX e ouro. */
const SAT_MIN = 10;
const SAT_MAX = 34;

function gerar() {
  if (!fs.existsSync(ENTRADA)) {
    throw new Error(`Arquivo de origem nao encontrado: ${ENTRADA}`);
  }

  const origem = PNG.sync.read(fs.readFileSync(ENTRADA));
  const { width: W, height: H } = origem;

  // 1. Recorte quadrado central - descarta as sobras laterais e a marca d'agua.
  const lado = Math.min(W, H);
  const offsetX = Math.round((W - lado) / 2);
  const offsetY = Math.round((H - lado) / 2);

  // 2. Reamostragem por media de area (box filter).
  const escala = lado / LADO_FINAL;
  const destino = new PNG({ width: LADO_FINAL, height: LADO_FINAL });

  let opacos = 0;
  let transparentes = 0;

  for (let y = 0; y < LADO_FINAL; y++) {
    for (let x = 0; x < LADO_FINAL; x++) {
      const xIni = offsetX + Math.floor(x * escala);
      const xFim = offsetX + Math.floor((x + 1) * escala);
      const yIni = offsetY + Math.floor(y * escala);
      const yFim = offsetY + Math.floor((y + 1) * escala);

      let somaR = 0;
      let somaG = 0;
      let somaB = 0;
      let n = 0;

      for (let sy = yIni; sy < Math.max(yFim, yIni + 1); sy++) {
        for (let sx = xIni; sx < Math.max(xFim, xIni + 1); sx++) {
          const i = (W * sy + sx) << 2;
          somaR += origem.data[i];
          somaG += origem.data[i + 1];
          somaB += origem.data[i + 2];
          n++;
        }
      }

      const r = somaR / n;
      const g = somaG / n;
      const b = somaB / n;

      // 3. Alfa a partir da saturacao, com rampa suave para nao serrilhar.
      const saturacao = Math.max(r, g, b) - Math.min(r, g, b);
      const alfa = Math.max(0, Math.min(1, (saturacao - SAT_MIN) / (SAT_MAX - SAT_MIN)));

      if (alfa >= 0.99) opacos++;
      if (alfa <= 0.01) transparentes++;

      const j = (LADO_FINAL * y + x) << 2;
      destino.data[j] = Math.round(r);
      destino.data[j + 1] = Math.round(g);
      destino.data[j + 2] = Math.round(b);
      destino.data[j + 3] = Math.round(alfa * 255);
    }
  }

  fs.writeFileSync(SAIDA, PNG.sync.write(destino, { deflateLevel: 9 }));

  const total = LADO_FINAL * LADO_FINAL;
  const antes = fs.statSync(ENTRADA).size;
  const depois = fs.statSync(SAIDA).size;

  console.log(`origem:  ${W}x${H}  ${(antes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`recorte: ${lado}x${lado} a partir de (${offsetX},${offsetY})`);
  console.log(
    `saida:   ${LADO_FINAL}x${LADO_FINAL}  ${(depois / 1024).toFixed(0)} KB` +
      `  (${(100 - (depois / antes) * 100).toFixed(1)}% menor)`,
  );
  console.log(
    `pixels:  ${((opacos / total) * 100).toFixed(1)}% opacos (brasao)` +
      ` | ${((transparentes / total) * 100).toFixed(1)}% transparentes (chapa)`,
  );
}

gerar();
