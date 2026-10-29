// Revisa los enlaces internos: que cada `docs/X.md` (o `.claude/rules/x.md`, o un `CLAUDE.md`) nombrado exista, y que cada sección
// citada con `› «Título»` o `, «Título»` esté en ese doc o en su copia completa de `docs/archivo/` (los docs vivos se adelgazaron el
// 2026-10-28: lo que salió sigue ahí, con su título, y se busca con grep). También los enlaces Markdown `[x](ruta)` de los `.md`.
// Uso: node scripts/enlaces-internos.mjs   (lo corre `bash scripts/mapa.sh --check`, y por eso lefthook en pre-commit y CI)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Dónde se buscan citas. `docs/archivo/` no: es una copia congelada, con las citas que tenía.
const RAICES = [
  'docs',
  'src',
  'scripts',
  'e2e',
  'supabase',
  '.claude',
  '.github',
  'CLAUDE.md',
  'README.md',
]
const IGNORADOS = new Set([
  'node_modules',
  '.next',
  '.next-e2e',
  'archivo',
  '.temp',
  '.branches',
  'test-salidas',
])
const EXTENSIONES = new Set([
  '.md',
  '.ts',
  '.tsx',
  '.mjs',
  '.js',
  '.sh',
  '.sql',
  '.yml',
  '.yaml',
  '.json',
  '.toml',
  '.css',
])

// Una ruta de doc citada: `docs/X.md`, `.claude/rules/x.md`, `CLAUDE.md` (raíz) o `src/…/CLAUDE.md`.
const RUTA_DE_DOC =
  /((?:docs\/[\w./-]+|\.claude\/rules\/[\w-]+|src\/[\w/-]*CLAUDE|(?<![\w/.])CLAUDE)\.md)/g
// Lo que sigue a la ruta: un cierre de código opcional y `› «…»` o `, «…»` (una o varias, encadenadas con ›).
const SECCIONES = /^`?((?:\s*(?:›|,)\s*«[^»\n]+»)+)/
const UNA_SECCION = /«([^»\n]+)»/g
const ENLACE_MD = /\]\(([^)\s]+)\)/g

// La copia completa de un doc vivo en el archivo, si la hay.
export function rutaEnElArchivo(ruta) {
  if (ruta === 'CLAUDE.md') return 'docs/archivo/CLAUDE.md'
  let m = /^docs\/([^/]+\.md)$/.exec(ruta)
  if (m) return `docs/archivo/${m[1]}`
  m = /^\.claude\/rules\/([\w-]+\.md)$/.exec(ruta)
  if (m) return `docs/archivo/reglas/${m[1]}`
  m = /^src\/modules\/([\w-]+)\/CLAUDE\.md$/.exec(ruta)
  if (m) return `docs/archivo/modulos/${m[1]}.md`
  if (ruta === 'src/shared/CLAUDE.md') return 'docs/archivo/modulos/shared.md'
  return null
}

// Los títulos de un doc: las líneas de encabezado y lo que va en negrita (una regla se cita por su título en negrita).
export function titulosDe(texto) {
  const titulos = []
  for (const linea of texto.split('\n')) {
    if (/^#{1,6} /.test(linea)) titulos.push(linea.replace(/^#{1,6} /, ''))
    for (const m of linea.matchAll(/\*\*([^*\n]+)\*\*/g)) titulos.push(m[1])
  }
  return titulos
}

// Las citas de un texto: `{ linea, ruta, secciones }`.
export function citasDe(texto) {
  const citas = []
  texto.split('\n').forEach((linea, i) => {
    for (const m of linea.matchAll(RUTA_DE_DOC)) {
      const ruta = m[1]
      const resto = linea.slice((m.index ?? 0) + ruta.length)
      const s = SECCIONES.exec(resto)
      const secciones = s ? [...s[1].matchAll(UNA_SECCION)].map((x) => x[1].trim()) : []
      citas.push({ linea: i + 1, ruta, secciones })
    }
  })
  return citas
}

// Los enlaces Markdown relativos de un `.md` (sin http, mailto ni sólo ancla).
export function enlacesDe(texto) {
  const enlaces = []
  texto.split('\n').forEach((linea, i) => {
    for (const m of linea.matchAll(ENLACE_MD)) {
      const destino = m[1]
      if (/^(https?:|mailto:|#)/.test(destino)) continue
      enlaces.push({ linea: i + 1, destino: destino.split('#')[0] })
    }
  })
  return enlaces
}

function archivosDe(raiz, base) {
  const ruta = path.join(base, raiz)
  if (!existsSync(ruta)) return []
  if (statSync(ruta).isFile()) return [raiz]
  const salida = []
  for (const nombre of readdirSync(ruta)) {
    if (IGNORADOS.has(nombre)) continue
    const relativa = path.join(raiz, nombre)
    const completa = path.join(base, relativa)
    if (statSync(completa).isDirectory()) salida.push(...archivosDe(relativa, base))
    else if (EXTENSIONES.has(path.extname(nombre))) salida.push(relativa)
  }
  return salida
}

// Los problemas del repo en `base`: `{ archivo, linea, motivo }`.
export function problemasDeEnlaces(base = '.') {
  const textos = new Map()
  const leer = (ruta) => {
    if (!textos.has(ruta)) {
      const completa = path.join(base, ruta)
      textos.set(ruta, existsSync(completa) ? readFileSync(completa, 'utf8') : null)
    }
    return textos.get(ruta)
  }
  const problemas = []
  // Las pruebas no son documentación: llevan citas rotas a propósito (las de este mismo chequeo).
  for (const archivo of RAICES.flatMap((r) => archivosDe(r, base)).filter(
    (a) => !/\.test\.[cm]?[jt]sx?$/.test(a),
  )) {
    const texto = leer(archivo)
    if (texto === null) continue
    for (const { linea, ruta, secciones } of citasDe(texto)) {
      // Una ruta que lleva comodines o marcadores (`docs/<X>.md`, `docs/X.md` de un ejemplo) no es una cita.
      if (/[<>*]|\/x\.md$/i.test(ruta)) continue
      const vivo = leer(ruta)
      const archivado = rutaEnElArchivo(ruta)
      const copia = archivado ? leer(archivado) : null
      if (vivo === null && copia === null) {
        problemas.push({ archivo, linea, motivo: `${ruta} no existe` })
        continue
      }
      const titulos = [...(vivo ? titulosDe(vivo) : []), ...(copia ? titulosDe(copia) : [])]
      for (const seccion of secciones) {
        if (!titulos.some((t) => t.includes(seccion))) {
          problemas.push({
            archivo,
            linea,
            motivo: `«${seccion}» no es un título de ${ruta}${copia ? ' (ni de su copia en docs/archivo)' : ''}`,
          })
        }
      }
    }
    if (archivo.endsWith('.md')) {
      for (const { linea, destino } of enlacesDe(texto)) {
        if (destino === '') continue
        const objetivo = path.normalize(path.join(path.dirname(archivo), destino))
        if (!existsSync(path.join(base, objetivo))) {
          problemas.push({ archivo, linea, motivo: `el enlace a ${destino} no lleva a nada` })
        }
      }
    }
  }
  return problemas
}

function principal() {
  const problemas = problemasDeEnlaces('.')
  for (const p of problemas) console.error(`✗ ${p.archivo}:${String(p.linea)}: ${p.motivo}`)
  if (problemas.length > 0) {
    console.error(
      `${String(problemas.length)} enlaces internos rotos. Una sección citada tiene que ser un título del doc o de su copia en docs/archivo/.`,
    )
    process.exit(1)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal()
}
