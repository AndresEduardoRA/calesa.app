import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// `anotar-decision.sh` es el hook PostToolUse de `AskUserQuestion` de la sesión de decidir. Esa sesión no escribe nada (escribir en
// `.git/` preguntaría por permiso en el celular): la respuesta de la persona la anota este hook, y bash escribe `decision.md` con el
// `id` de la compuerta vigente y «me respondió: «…»» literal. La doc no detalla `tool_response` de `AskUserQuestion`: se lee de donde
// venga y, si no viene, del transcript de la sesión, que escribe Claude Code y no el modelo (`decidir.sh --prueba` lo confirma).
const SCRIPT = resolve('scripts/piloto/anotar-decision.sh')

let raiz = ''
let comun = ''
const raices: string[] = []

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'anotar-'))
  raices.push(raiz)
  comun = join(raiz, 'comun')
  mkdirSync(comun)
  writeFileSync(join(comun, 'compuerta.md'), 'id: gate-42\ntipo: datos\npaso: 4.15\n')
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

const PREGUNTA = {
  questions: [
    {
      question: 'Paró por el disco: ¿sigo?',
      header: 'parada',
      multiSelect: false,
      options: [
        { label: 'parado', description: 'recomendado' },
        { label: 'sigo', description: 'ignora el aviso' },
      ],
    },
  ],
}

function anotar(
  entrada: Record<string, unknown>,
  entorno: Record<string, string> = { PILOTO_SESION: 'decidir' },
) {
  return spawnSync('bash', [SCRIPT], {
    input: JSON.stringify({
      hook_event_name: 'PostToolUse',
      tool_name: 'AskUserQuestion',
      tool_input: PREGUNTA,
      ...entrada,
    }),
    encoding: 'utf8',
    env: { NODE_ENV: 'test', PATH: process.env['PATH'] ?? '', PILOTO_COMUN: comun, ...entorno },
  })
}

const decision = () => readFileSync(join(comun, 'decision.md'), 'utf8')

describe('anotar-decision.sh › lo que escribe', () => {
  it('la respuesta de tool_response.answers, con el id de la compuerta y «me respondió»', () => {
    const r = anotar({ tool_response: { answers: { 'Paró por el disco: ¿sigo?': 'sigo' } } })
    expect(r.status, r.stderr).toBe(0)
    const texto = decision()
    expect(texto).toContain('id: gate-42\n')
    expect(texto).toContain('opcion: sigo\n')
    expect(texto).toContain('me respondió: «sigo»')
    expect(texto).toMatch(/creada: \d+/)
  })

  it('una respuesta escrita por la persona («Other») queda literal', () => {
    anotar({
      tool_response: {
        answers: {
          'Paró por el disco: ¿sigo?':
            'primero libera 5 GB y después sigue, con ; comas, y «comillas»',
        },
      },
    })
    expect(decision()).toContain(
      'me respondió: «primero libera 5 GB y después sigue, con ; comas, y «comillas»»',
    )
  })

  it('las notas de la anotación van aparte', () => {
    anotar({
      tool_response: {
        answers: { 'Paró por el disco: ¿sigo?': 'sigo' },
        annotations: { 'Paró por el disco: ¿sigo?': { notes: 'hasta las 18:00' } },
      },
    })
    expect(decision()).toContain('notas: hasta las 18:00')
  })

  it('con varias preguntas, una línea por respuesta', () => {
    anotar({ tool_response: { answers: { uno: 'a', dos: 'b' } } })
    expect(decision()).toContain('opcion: a | b')
  })

  it('una tool_response de texto se lee tal cual', () => {
    anotar({
      tool_response: 'User has answered your questions: "Paró por el disco: ¿sigo?"="parado".',
    })
    expect(decision()).toContain('parado')
  })

  it('sin respuesta en la entrada, la lee del transcript de la sesión', () => {
    const transcript = join(raiz, 'sesion.jsonl')
    writeFileSync(
      transcript,
      [
        JSON.stringify({ type: 'user', message: { content: 'hola' } }),
        JSON.stringify({
          type: 'user',
          message: {
            content: [
              { type: 'tool_result', tool_use_id: 'otra', content: 'otra cosa' },
              {
                type: 'tool_result',
                tool_use_id: 'toolu_9',
                content:
                  'User has answered your questions: "Paró por el disco: ¿sigo?"="parado". You can now continue.',
              },
            ],
          },
        }),
      ].join('\n'),
    )
    anotar({ tool_use_id: 'toolu_9', transcript_path: transcript, tool_response: {} })
    const texto = decision()
    expect(texto).toContain('"parado"')
    expect(texto).toContain('id: gate-42')
  })

  it('una decisión nueva reemplaza a la anterior', () => {
    anotar({ tool_response: { answers: { p: 'primera' } } })
    anotar({ tool_response: { answers: { p: 'segunda' } } })
    expect(decision()).toContain('segunda')
    expect(decision()).not.toContain('primera')
  })
})

describe('anotar-decision.sh › lo que no escribe', () => {
  it('fuera de PILOTO_SESION=decidir no hace nada', () => {
    for (const entorno of [{}, { PILOTO_SESION: 'paso' }, { PILOTO_SESION: 'ruteo' }] as Record<
      string,
      string
    >[]) {
      anotar({ tool_response: { answers: { p: 'x' } } }, entorno)
      expect(existsSync(join(comun, 'decision.md'))).toBe(false)
    }
  })

  it('otra herramienta que no es AskUserQuestion no se anota', () => {
    anotar({ tool_name: 'Read', tool_response: { answers: { p: 'x' } } })
    expect(existsSync(join(comun, 'decision.md'))).toBe(false)
  })

  it('sin compuerta vigente no hay a qué id atar la respuesta', () => {
    rmSync(join(comun, 'compuerta.md'))
    anotar({ tool_response: { answers: { p: 'x' } } })
    expect(existsSync(join(comun, 'decision.md'))).toBe(false)
  })

  it('una entrada que no es JSON no rompe la sesión', () => {
    const r = spawnSync('bash', [SCRIPT], {
      input: 'no es json',
      encoding: 'utf8',
      env: {
        NODE_ENV: 'test',
        PATH: process.env['PATH'] ?? '',
        PILOTO_COMUN: comun,
        PILOTO_SESION: 'decidir',
      },
    })
    expect(r.status).toBe(0)
    expect(existsSync(join(comun, 'decision.md'))).toBe(false)
  })
})
