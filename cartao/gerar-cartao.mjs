// Gera o cartão-presente (55 × 85 mm) com QR para o formulário de inscrição.
//
//   cd cartao && npm install && npm run gerar
//   URL=https://outro-endereco/ npm run gerar   (para trocar o endereço do QR)
//
// Saída em cartao/saida/:
//   cartao-presente-55x85mm.pdf              tamanho final (55 × 85 mm)
//   cartao-presente-55x85mm-sangria-3mm.pdf  61 × 91 mm, para gráficas que pedem sangria
//   cartao-presente-600dpi.png               PNG em alta resolução do cartão
//   qr-formulario-patricia.png / .svg        QR separado, preto sobre branco
//
// Depois de gerar, o script lê os QRs dos PNGs e confere se apontam para a URL.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import puppeteer from 'puppeteer-core';

const URL_FORMULARIO = process.env.URL ?? 'https://oncompanny-web.github.io/formulario-patricia/';
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DPI = 600;

const aqui = path.dirname(fileURLToPath(import.meta.url));
const saida = path.join(aqui, 'saida');
const logoBege = path.join(aqui, '..', 'public', 'assets', 'simbolo-bege.png');

const QR_OPCOES = {
  errorCorrectionLevel: 'Q', // tolera ~25% de dano (impressão, sujeira, dobra)
  margin: 4, // zona de silêncio padrão
  color: { dark: '#000000', light: '#FFFFFF' },
};

// Fontes embutidas (Google Fonts, licença OFL) — a geração não depende de internet.
const fonte = async (arquivo) =>
  `data:font/woff2;base64,${(await readFile(path.join(aqui, 'fontes', arquivo))).toString('base64')}`;
const FONTES_CSS = `
  @font-face { font-family: 'Cormorant Garamond'; font-style: italic; font-weight: 500; src: url(${await fonte('cormorant-italic-500.woff2')}) format('woff2'); }
  @font-face { font-family: 'Cormorant Garamond'; font-style: normal; font-weight: 600; src: url(${await fonte('cormorant-600.woff2')}) format('woff2'); }
  @font-face { font-family: 'DM Sans'; font-style: normal; font-weight: 500; src: url(${await fonte('dmsans-500.woff2')}) format('woff2'); }`;

function htmlCartao({ qrSvg, logoDataUri, sangria }) {
  const s = sangria ? 3 : 0;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>${FONTES_CSS}
  @page { size: ${55 + 2 * s}mm ${85 + 2 * s}mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${55 + 2 * s}mm; height: ${85 + 2 * s}mm; background: #58101C; }
  body { padding: ${s}mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .cartao {
    width: 55mm; height: 85mm; background: #58101C;
    display: flex; flex-direction: column; align-items: center; justify-content: space-between;
    padding: 6.5mm 5mm 5.5mm; text-align: center;
  }
  .logo { width: 17mm; height: auto; display: block; }
  .presente {
    font-family: 'Cormorant Garamond', serif; font-style: italic; font-weight: 500;
    font-size: 15.5pt; line-height: 1.05; color: #CBB8A7;
  }
  .fio { display: block; width: 8mm; height: 0.25mm; background: #CBB8A7; opacity: .6; margin: 2.4mm auto; }
  .metodo {
    font-family: 'Cormorant Garamond', serif; font-weight: 600;
    font-size: 12pt; line-height: 1.1; color: #F7EFE7; letter-spacing: .01em;
  }
  .qr { width: 27mm; margin: 0 auto; background: #FFFFFF; border-radius: 1mm; overflow: hidden; }
  .qr svg { display: block; width: 100%; height: auto; }
  .cta {
    margin-top: 2.2mm; font-family: 'DM Sans', sans-serif; font-weight: 500;
    font-size: 6.3pt; letter-spacing: .03em; color: #CBB8A7;
  }
</style></head>
<body>
  <div class="cartao" id="cartao">
    <img class="logo" src="${logoDataUri}" alt="">
    <div>
      <p class="presente">Um presente para você</p>
      <span class="fio"></span>
      <p class="metodo">Método Patrícia Petraroli</p>
    </div>
    <div>
      <div class="qr">${qrSvg}</div>
      <p class="cta">Escaneie para cadastrar seu acesso</p>
    </div>
  </div>
</body></html>`;
}

function lerQr(bufferPng) {
  const png = PNG.sync.read(bufferPng);
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
}

await mkdir(saida, { recursive: true });

// QR separado
const qrSvg = await QRCode.toString(URL_FORMULARIO, { ...QR_OPCOES, type: 'svg' });
await writeFile(path.join(saida, 'qr-formulario-patricia.svg'), qrSvg);
const qrPng = await QRCode.toBuffer(URL_FORMULARIO, { ...QR_OPCOES, type: 'png', width: 2000 });
await writeFile(path.join(saida, 'qr-formulario-patricia.png'), qrPng);

const logoDataUri = `data:image/png;base64,${(await readFile(logoBege)).toString('base64')}`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  const mmParaPx = 96 / 25.4;
  await page.setViewport({
    width: Math.ceil(55 * mmParaPx),
    height: Math.ceil(85 * mmParaPx),
    deviceScaleFactor: DPI / 96,
  });

  for (const sangria of [false, true]) {
    await page.setContent(htmlCartao({ qrSvg, logoDataUri, sangria }), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const fontesOk = await page.evaluate(
      () =>
        document.fonts.check('italic 500 16px "Cormorant Garamond"') &&
        document.fonts.check('600 16px "Cormorant Garamond"') &&
        document.fonts.check('500 16px "DM Sans"'),
    );
    if (!fontesOk) throw new Error('Fontes não carregaram (pasta cartao/fontes).');

    const nome = sangria ? 'cartao-presente-55x85mm-sangria-3mm.pdf' : 'cartao-presente-55x85mm.pdf';
    await page.pdf({
      path: path.join(saida, nome),
      width: `${55 + (sangria ? 6 : 0)}mm`,
      height: `${85 + (sangria ? 6 : 0)}mm`,
      printBackground: true,
      pageRanges: '1',
    });

    if (!sangria) {
      const cartaoPng = await (await page.$('#cartao')).screenshot({ type: 'png' });
      await writeFile(path.join(saida, 'cartao-presente-600dpi.png'), cartaoPng);
      await writeFile(path.join(saida, 'cartao-presente-preview.html'), htmlCartao({ qrSvg, logoDataUri, sangria }));
    }
  }
} finally {
  await browser.close();
}

// Conferência: os QRs devem abrir exatamente a URL do formulário.
const conferencias = {
  'qr-formulario-patricia.png': lerQr(await readFile(path.join(saida, 'qr-formulario-patricia.png'))),
  'cartao-presente-600dpi.png': lerQr(await readFile(path.join(saida, 'cartao-presente-600dpi.png'))),
};
let falhou = false;
for (const [arquivo, lido] of Object.entries(conferencias)) {
  const ok = lido === URL_FORMULARIO;
  falhou ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${arquivo}: ${lido ?? '(QR não lido)'}`);
}
const png = PNG.sync.read(await readFile(path.join(saida, 'cartao-presente-600dpi.png')));
console.log(`PNG do cartão: ${png.width} × ${png.height} px (${DPI} dpi)`);
console.log(`Arquivos em ${saida}`);
if (falhou) process.exit(1);
