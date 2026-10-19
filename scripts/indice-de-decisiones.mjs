// Genera el índice de `docs/DECISIONES.md`: una línea por entrada (su línea en el archivo, su fecha y su título), entre las marcas
// `indice:inicio` e `indice:fin`. El archivo pesa ~400 KB y crece con cada parte: leerlo entero para encontrar una decisión no escala;
// el índice pesa una décima parte y dice dónde abrir (`Read` con `offset` = la línea).
// Uso: node scripts/indice-de-decisiones.mjs            reescribe el índice (lo corre `bash scripts/mapa.sh`, y por eso el hook Stop)
//      node scripts/indice-de-decisiones.mjs --check    falla si el índice está desactualizado (`mapa.sh --check`: lefthook y CI)
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const ARCHIVO = 'docs/DECISIONES.md'
export const MARCA_DE_INICIO = '<!-- indice:inicio (generado por scripts/mapa.sh: no se edita) -->'
export const MARCA_DE_FIN = '<!-- indice:fin -->'
export const LARGO_DEL_TITULO = 100

const ENTRADA = /^## (\d{4}-\d{2}-\d{2}) — (.*)$/

// El título a lo largo de una línea de índice: corta en una palabra y no deja un `código` abierto.
export function recortarTitulo(titulo, largo = LARGO_DEL_TITULO) {
  if (titulo.length <= largo) {
    return titulo
  }
  let corte = titulo.slice(0, largo - 1)
  if ((corte.match(/`/g) ?? []).length % 2 === 1) {
    corte = corte.slice(0, corte.lastIndexOf('`'))
  } else {
    const espacio = corte.lastIndexOf(' ')
    corte = espacio > largo / 2 ? corte.slice(0, espacio) : corte
  }
  return `${corte.trimEnd().replace(/[,;:.]$/, '')}…`
}

// Las entradas de un texto, con su línea (desde 1). La plantilla (`## AAAA-MM-DD`) no tiene dígitos.
export function entradasDe(texto) {
  const entradas = []
  texto.split('\n').forEach((linea, i) => {
    const coincide = ENTRADA.exec(linea)
    if (coincide?.[1] && coincide[2] !== undefined) {
      entradas.push({ linea: i + 1, fecha: coincide[1], titulo: coincide[2] })
    }
  })
  return entradas
}

// El texto con su índice al día. Las líneas del índice no son entradas (empiezan con «- »), así que no se cuentan a sí mismas; y como
// el bloque va antes de todas las entradas, la línea de cada una es la que tendría sin el bloque más las que éste ocupa: las filas y las
// dos en blanco que prettier exige entre un comentario HTML y una lista.
export function conIndice(texto) {
  const inicio = texto.indexOf(MARCA_DE_INICIO)
  const fin = texto.indexOf(MARCA_DE_FIN)
  if (inicio === -1 || fin === -1 || fin < inicio) {
    throw new Error(
      `${ARCHIVO} tiene que llevar «${MARCA_DE_INICIO}» y «${MARCA_DE_FIN}», en ese orden, antes de las entradas.`,
    )
  }
  const antes = texto.slice(0, inicio + MARCA_DE_INICIO.length)
  const despues = texto.slice(fin)
  const entradas = entradasDe(`${antes}\n${despues}`)
  if (entradas.length === 0) {
    return `${antes}\n${despues}`
  }
  const ocupa = entradas.length + 2
  const filas = entradas.map(
    (e) => `- L${String(e.linea + ocupa)} · ${e.fecha} · ${recortarTitulo(e.titulo)}`,
  )
  return `${antes}\n\n${filas.join('\n')}\n\n${despues}`
}

function principal(args) {
  const actual = readFileSync(ARCHIVO, 'utf8')
  const nuevo = conIndice(actual)
  if (nuevo === actual) {
    return
  }
  if (args.includes('--check')) {
    console.error(`✗ ${ARCHIVO}: el índice está desactualizado. Corre: bash scripts/mapa.sh`)
    process.exit(1)
  }
  writeFileSync(ARCHIVO, nuevo)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal(process.argv.slice(2))
}
