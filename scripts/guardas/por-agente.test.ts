import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Los hooks del frontmatter de un agente sólo corren con la carpeta confiada, y `claude -p` en una carpeta sin confiar no los aplica
// (lo mostró la sonda del ensayo en seco: el auditor corrió `touch .piloto/sonda`). Los hooks de `settings.json` sí corren, también dentro
// de los subagentes, y su entrada trae `agent_type`. `por-agente.sh` los usa: el auditor y el planificador pasan por las mismas guardas
// de sólo lectura sin importar la confianza; cualquier otro agente, o la sesión principal, no se toca.
const HOOK = resolve('.claude/hooks/por-agente.sh')

let raiz = ''
beforeAll(() => {
  raiz = realpathSync(mkdtempSync(join(tmpdir(), 'por-agente-')))
  execFileSync('git', ['init', '-q', '-b', 'main', raiz])
  mkdirSync(join(raiz, '.piloto/planes'), { recursive: true })
})
afterAll(() => rmSync(raiz, { recursive: true, force: true }))

function correr(agente: string | null, herramienta: string, entrada: Record<string, string>) {
  const r = spawnSync('bash', [HOOK], {
    input: JSON.stringify({
      tool_name: herramienta,
      tool_input: entrada,
      cwd: raiz,
      ...(agente ? { agent_id: 'a1', agent_type: agente } : {}),
    }),
    encoding: 'utf8',
  })
  return { estado: r.status, motivo: r.stderr }
}
const bash = (agente: string | null, command: string) => correr(agente, 'Bash', { command })
const escribir = (agente: string | null, ruta: string, herramienta = 'Write') =>
  correr(agente, herramienta, { file_path: join(raiz, ruta) })

describe('por-agente.sh › el Bash del auditor y del planificador es de sólo lectura', () => {
  it.each(['auditor', 'planificador'])('%s: lee', (agente) => {
    for (const comando of [
      'ls docs',
      'git log --oneline -3',
      'grep -n x docs/PLAN.md | head',
      'node scripts/piloto/nivel.mjs src/proxy.ts',
    ]) {
      expect(bash(agente, comando).estado, comando).toBe(0)
    }
  })

  it.each(['auditor', 'planificador'])(
    '%s: no escribe ni ejecuta (la sonda del ensayo)',
    (agente) => {
      for (const comando of [
        'touch .piloto/sonda',
        'echo x > a.txt',
        'git push origin main',
        'rm -f a',
        'pnpm test',
        'git commit -m x',
      ]) {
        const r = bash(agente, comando)
        expect({ comando, estado: r.estado, motivo: r.motivo.length > 0 }).toEqual({
          comando,
          estado: 2,
          motivo: true,
        })
      }
    },
  )
})

describe('por-agente.sh › Write y Edit', () => {
  it('el auditor no escribe en ninguna parte', () => {
    for (const herramienta of ['Write', 'Edit', 'NotebookEdit']) {
      expect(escribir('auditor', '.piloto/planes/4.13.md', herramienta).estado, herramienta).toBe(2)
    }
  })

  it('el planificador sólo escribe su plan', () => {
    expect(escribir('planificador', '.piloto/planes/4.13.md').estado).toBe(0)
    expect(escribir('planificador', '.piloto/planes/4.13.md', 'Edit').estado).toBe(0)
    for (const ruta of [
      'src/a.ts',
      'docs/ESTADO.md',
      '.piloto/informes/4.13.md',
      '.piloto/planes/../informes/x.md',
    ]) {
      expect(escribir('planificador', ruta).estado, ruta).toBe(2)
    }
  })
})

describe('por-agente.sh › lo que no es de esos dos agentes no se toca', () => {
  it.each([null, 'revisor', 'general-purpose', 'Explore'])('agente «%s»: pasa todo', (agente) => {
    expect(bash(agente, 'touch x && git push origin main').estado).toBe(0)
    expect(escribir(agente, 'src/a.ts').estado).toBe(0)
  })

  it('una herramienta que no es Bash ni de escritura pasa', () => {
    expect(correr('auditor', 'Read', { file_path: join(raiz, 'README.md') }).estado).toBe(0)
    expect(correr('auditor', 'Grep', { pattern: 'x' }).estado).toBe(0)
  })

  it('una entrada que no es JSON no rompe la sesión', () => {
    const r = spawnSync('bash', [HOOK], { input: 'no es json', encoding: 'utf8' })
    expect(r.status).toBe(0)
  })
})
