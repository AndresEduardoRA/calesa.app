// Monta varias capturas de e2e (`E2E_CAPTURAS=<carpeta>`) en una sola imagen, cada una rotulada con su nombre, a un tamaño que `Read`
// lee con nitidez: mirar 115 capturas una por una no escala (el cierre 3 abrió 17), y lo que no se abre no se mira.
// Uso: node scripts/hoja-de-contacto.mjs <carpeta> [--columnas N] [--filas N]
//   <carpeta>/<proyecto>/*.png  →  <carpeta>/hojas/<proyecto>-NN.png (y <carpeta>/hojas/indice.txt: qué capturas lleva cada hoja)
// Sin banderas: las capturas apaisadas (escritorio) van de a 4 (2×2) y las verticales (celular) de a 3 (3×1). Una hoja no pasa de 2.000 px
// de lado (más y el visor la reduce y el texto se pierde); lo que no cabe a tamaño real se achica, nunca se corta. Playwright (ya está en
// el repo) arma la página y la captura: sin dependencias nuevas.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const LADO_MAXIMO = 2000
export const SEPARACION = 12
export const ALTO_DEL_ROTULO = 44

// El ancho y el alto de un PNG, de su cabecera (IHDR): sin decodificar la imagen.
export function medidasDelPng(bytes) {
  const firma = bytes.subarray(1, 4).toString('latin1')
  if (firma !== 'PNG') {
    throw new Error('No es un PNG.')
  }
  return { ancho: bytes.readUInt32BE(16), alto: bytes.readUInt32BE(20) }
}

// Cuántas columnas y filas lleva una hoja de capturas de ese tamaño, si no se pidió otra cosa.
export function disposicion({ ancho, alto }, pedida = {}) {
  const porDefecto = ancho >= alto ? { columnas: 2, filas: 2 } : { columnas: 3, filas: 1 }
  return {
    columnas: pedida.columnas ?? porDefecto.columnas,
    filas: pedida.filas ?? porDefecto.filas,
  }
}

// El tamaño de cada celda y de la hoja: la captura a su tamaño real, o más chica si no cabe en 2.000 px de lado.
export function medidasDeLaHoja({ ancho, alto }, { columnas, filas }) {
  const sobraAncho = LADO_MAXIMO - (columnas + 1) * SEPARACION
  const sobraAlto = LADO_MAXIMO - (filas + 1) * SEPARACION - filas * ALTO_DEL_ROTULO
  const escala = Math.min(1, sobraAncho / (columnas * ancho), sobraAlto / (filas * alto))
  const celda = { ancho: Math.floor(ancho * escala), alto: Math.floor(alto * escala) }
  return {
    escala,
    celda,
    hoja: {
      ancho: columnas * celda.ancho + (columnas + 1) * SEPARACION,
      alto: filas * (celda.alto + ALTO_DEL_ROTULO) + (filas + 1) * SEPARACION,
    },
  }
}

// Las capturas, en el orden en que se tomaron (por nombre), de a `porHoja`.
export function partirEnHojas(nombres, porHoja) {
  const ordenados = [...nombres].sort((a, b) => a.localeCompare(b, 'en'))
  const hojas = []
  for (let desde = 0; desde < ordenados.length; desde += porHoja) {
    hojas.push(ordenados.slice(desde, desde + porHoja))
  }
  return hojas
}

const rotuloDe = (archivo) => basename(archivo, '.png')

const escapar = (texto) =>
  texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')

function paginaDeLaHoja(archivos, { columnas }, { celda, hoja }) {
  const figuras = archivos
    .map(
      (archivo) =>
        `<figure><img src="${escapar(pathToFileURL(archivo).href)}" alt=""><figcaption>${escapar(rotuloDe(archivo))}</figcaption></figure>`,
    )
    .join('')
  return `<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; background: #d9dce1; width: ${String(hoja.ancho)}px; height: ${String(hoja.alto)}px; box-sizing: border-box;
      padding: ${String(SEPARACION)}px; display: grid; grid-template-columns: repeat(${String(columnas)}, ${String(celda.ancho)}px);
      grid-auto-rows: ${String(celda.alto + ALTO_DEL_ROTULO)}px; gap: ${String(SEPARACION)}px; align-content: start;
      font: 600 17px/1.15 system-ui, sans-serif; color: #111 }
    figure { margin: 0; overflow: hidden }
    img { display: block; width: ${String(celda.ancho)}px; height: ${String(celda.alto)}px; object-fit: contain; object-position: top left; background: #fff }
    figcaption { height: ${String(ALTO_DEL_ROTULO)}px; padding-top: 5px; word-break: break-all }
  </style><body>${figuras}</body>`
}

function leerBanderas(argumentos) {
  const pedida = {}
  const carpetas = []
  for (let i = 0; i < argumentos.length; i += 1) {
    const argumento = argumentos[i]
    if (argumento === '--columnas' || argumento === '--filas') {
      const valor = Number(argumentos[i + 1])
      if (!Number.isInteger(valor) || valor < 1 || valor > 6) {
        throw new Error(`${argumento} pide un entero de 1 a 6.`)
      }
      pedida[argumento === '--columnas' ? 'columnas' : 'filas'] = valor
      i += 1
    } else {
      carpetas.push(argumento)
    }
  }
  return { pedida, carpetas }
}

async function principal() {
  const { pedida, carpetas } = leerBanderas(process.argv.slice(2))
  const [entrada] = carpetas
  if (!entrada || carpetas.length > 1) {
    console.error('Uso: node scripts/hoja-de-contacto.mjs <carpeta> [--columnas N] [--filas N]')
    process.exit(1)
  }
  const raiz = resolve(entrada)
  const destino = join(raiz, 'hojas')
  rmSync(destino, { recursive: true, force: true })
  mkdirSync(destino, { recursive: true })
  const proyectos = readdirSync(raiz, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'hojas')
    .map((e) => e.name)
    .sort()

  const { chromium } = await import('@playwright/test')
  const navegador = await chromium.launch()
  const indice = []
  let total = 0
  try {
    for (const proyecto of proyectos) {
      const carpeta = join(raiz, proyecto)
      const capturas = readdirSync(carpeta).filter((n) => n.endsWith('.png'))
      const [primera] = [...capturas].sort()
      if (!primera) {
        continue
      }
      const medidas = medidasDelPng(readFileSync(join(carpeta, primera)))
      const lugar = disposicion(medidas, pedida)
      const tamano = medidasDeLaHoja(medidas, lugar)
      const hojas = partirEnHojas(capturas, lugar.columnas * lugar.filas)
      const pagina = await navegador.newPage({
        viewport: { width: tamano.hoja.ancho, height: tamano.hoja.alto },
        deviceScaleFactor: 1,
      })
      for (const [indiceDeHoja, grupo] of hojas.entries()) {
        const nombre = `${proyecto}-${String(indiceDeHoja + 1).padStart(2, '0')}.png`
        const html = join(destino, `${nombre}.html`)
        writeFileSync(
          html,
          paginaDeLaHoja(
            grupo.map((n) => join(carpeta, n)),
            lugar,
            tamano,
          ),
        )
        await pagina.goto(pathToFileURL(html).href)
        await pagina.evaluate(() => Promise.all([...document.images].map((i) => i.decode())))
        await pagina.screenshot({ path: join(destino, nombre) })
        rmSync(html)
        indice.push(`${nombre}: ${grupo.map(rotuloDe).join(' | ')}`)
        total += grupo.length
      }
      await pagina.close()
      console.log(
        `${proyecto}: ${String(capturas.length)} capturas en ${String(hojas.length)} hojas de ${String(lugar.columnas)}×${String(lugar.filas)} (${String(tamano.hoja.ancho)}×${String(tamano.hoja.alto)} px, escala ${tamano.escala.toFixed(2)})`,
      )
    }
  } finally {
    await navegador.close()
  }
  writeFileSync(join(destino, 'indice.txt'), `${indice.join('\n')}\n`)
  console.log(`\n${String(indice.length)} hojas con ${String(total)} capturas en ${destino}\n`)
  console.log(indice.join('\n'))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal()
}
