import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// `paso_vivo` de compuerta.sh pregunta con `pgrep -f` si el paso sigue corriendo. `pgrep -f` mira la línea de comandos de todos los
// procesos y sólo se excluye a sí mismo: si dos bucles lo corren a la vez, cada `pgrep` ve el del otro (su línea lleva el patrón) y cree
// que hay un paso vivo. Pasaba en `pnpm test`, con dos archivos de bucle en paralelo: 1 de cada 8 corridas rechazaba una decisión buena
// («apareció con un paso vivo») y el test esperaba los 25 s. Aquí el «otro pgrep» es un señuelo con esa misma línea de comandos.
const COMPUERTA = resolve('scripts/piloto/compuerta.sh')
const PATRON = 'patron-unico-de-compuerta-vivo'

let dir = ''
const hijos: ChildProcess[] = []

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'compuerta-vivo-'))
})
afterEach(() => {
  for (const h of hijos.splice(0)) h.kill()
  rmSync(dir, { recursive: true, force: true })
})

/** Un proceso quieto cuya línea de comandos empieza por `argv0` (lo que `pgrep -f` y `ps` ven). */
function proceso(argv0: string) {
  const h = spawn('bash', ['-c', `exec -a "${argv0}" sleep 60`], { stdio: 'ignore' })
  hijos.push(h)
  // Espera a que el `exec -a` haya ocurrido: lo que importa es la línea de comandos del propio señuelo.
  spawnSync('bash', [
    '-c',
    'for i in $(seq 1 100); do grep -q "$1" "/proc/$2/cmdline" 2>/dev/null && exit 0; sleep 0.05; done; exit 1',
    '_',
    PATRON,
    String(h.pid),
  ])
  return h
}

function pasoVivo() {
  return spawnSync('bash', ['-c', `source "${COMPUERTA}"; paso_vivo`], {
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      PATH: process.env['PATH'] ?? '',
      ESTADO: dir,
      PILOTO_PGREP_PATRON: PATRON,
    },
  }).status
}

describe('compuerta.sh › paso_vivo', () => {
  it('sin ningún proceso que coincida, no hay paso vivo', () => {
    expect(pasoVivo()).toBe(1)
  })

  it('un proceso de verdad con el patrón en su línea de comandos es un paso vivo', () => {
    proceso(`claude -p /piloto ${PATRON}`)
    expect(pasoVivo()).toBe(0)
  })

  it('el pgrep de otro bucle, con el patrón en su línea, no es un paso vivo', () => {
    proceso(`pgrep -f -- ${PATRON}`)
    expect(pasoVivo()).toBe(1)
  })

  it('tampoco el pgrep -af del otro (la variante que lista las líneas)', () => {
    proceso(`pgrep -af -- ${PATRON}`)
    expect(pasoVivo()).toBe(1)
  })
})
