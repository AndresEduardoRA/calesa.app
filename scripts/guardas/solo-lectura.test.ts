import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BLOQUEA, PASA } from './solo-lectura.casos'

// `solo-lectura.sh` es el hook PreToolUse del Bash del auditor y del planificador (subagentes que no deben cambiar nada): admite por
// segmento una lista corta de comandos de lectura y rechaza todo lo demás, también lo que escribe por una redirección o se ejecuta
// por sustitución. Se prueba con el hook de verdad: cada comando → pasa (exit 0) o bloquea (exit 2 y el motivo por stderr).
const HOOK = resolve('.claude/hooks/solo-lectura.sh')

function correr(command: string) {
  const r = spawnSync('bash', [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd: process.cwd() }),
    encoding: 'utf8',
  })
  return { estado: r.status, motivo: r.stderr }
}

describe('solo-lectura.sh', () => {
  it.each(PASA)('admite: %s', (comando) => {
    expect(correr(comando).estado).toBe(0)
  })

  it.each(BLOQUEA)('rechaza: %s', (comando) => {
    const { estado, motivo } = correr(comando)
    expect({ estado, motivo: motivo.trim().length > 0 }).toEqual({ estado: 2, motivo: true })
  })

  it('un segmento que no es de lectura rechaza todo el comando, aunque lo demás lo sea', () => {
    expect(correr('ls && touch x').estado).toBe(2)
    expect(correr('git log | tee x').estado).toBe(2)
    expect(correr('touch x; ls').estado).toBe(2)
    expect(correr('ls || rm x').estado).toBe(2)
  })

  it('las comillas protegen los separadores y las redirecciones del texto que se busca', () => {
    expect(correr('grep -E "a|b" docs/PLAN.md').estado).toBe(0)
    expect(correr("grep 'a;b' docs/PLAN.md").estado).toBe(0)
    expect(correr('grep ">" docs/PLAN.md').estado).toBe(0)
  })

  it('sin comando, o con una entrada que no es JSON, no hay nada que rechazar', () => {
    for (const entrada of ['{}', '{"tool_input":{}}']) {
      const r = spawnSync('bash', [HOOK], { input: entrada, encoding: 'utf8' })
      expect(r.status, entrada).toBe(0)
    }
  })

  it('una entrada ilegible se rechaza: ante la duda, no se ejecuta', () => {
    const r = spawnSync('bash', [HOOK], { input: 'no es json', encoding: 'utf8' })
    expect(r.status).toBe(2)
  })
})
