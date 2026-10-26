// «Cero saltadas nuevas»: (1) busca en un diff las pruebas que se dejaron saltadas (`.skip`, `.skipIf`, `.fixme`, `.todo`, `xit`…) y
// (2) compara las que cuenta un `resultado.json` de Vitest contra las del marcador anterior.
//
// Uso: node scripts/piloto/saltadas.mjs <rango>                          → { n, nuevas: [{ archivo, linea, texto }] }
//      node scripts/piloto/saltadas.mjs --resultado <json> [--antes <n>]  → { pendientes, antes, nuevas }
// Se prueba en `saltadas.test.ts`.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const ES_PRUEBA = /\.(test|spec)\.[cm]?[jt]sx?$/
const SALTA = /\.(skip|skipIf|todo|fixme)\(|\bx(it|describe|test)\(/
const COMENTARIO = /^\s*(\/\/|\*|\/\*)/

export function saltadasEnElDiff(texto) {
  const halladas = []
  let archivo = null
  let linea = 0
  for (const l of texto.split('\n')) {
    if (l.startsWith('+++ ')) {
      archivo = l.slice(4).replace(/^b\//, '')
    } else if (l.startsWith('@@')) {
      linea = Number(/\+(\d+)/.exec(l)?.[1] ?? 0)
    } else if (l.startsWith('+')) {
      const codigo = l.slice(1)
      if (archivo && ES_PRUEBA.test(archivo) && !COMENTARIO.test(codigo) && SALTA.test(codigo)) {
        halladas.push({ archivo, linea, texto: codigo.trim() })
      }
      linea++
    } else if (l.startsWith(' ')) {
      linea++
    }
  }
  return halladas
}

export function saltadasDelResultado(texto, antes) {
  const r = JSON.parse(texto)
  if (typeof r?.numPendingTests !== 'number') {
    throw new Error('no es el resultado.json de Vitest: falta numPendingTests')
  }
  const pendientes = r.numPendingTests + (r.numTodoTests ?? 0)
  return { pendientes, antes, nuevas: antes === null ? null : Math.max(0, pendientes - antes) }
}

function main(argv) {
  const i = argv.indexOf('--resultado')
  if (i >= 0) {
    const j = argv.indexOf('--antes')
    const antes = j >= 0 ? Number(argv[j + 1]) : null
    return saltadasDelResultado(readFileSync(argv[i + 1], 'utf8'), antes)
  }
  const diff = execFileSync('git', ['diff', '-U0', argv[0] ?? 'HEAD~1..HEAD'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
  const nuevas = saltadasEnElDiff(diff)
  return { n: nuevas.length, nuevas }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(main(process.argv.slice(2))))
}
