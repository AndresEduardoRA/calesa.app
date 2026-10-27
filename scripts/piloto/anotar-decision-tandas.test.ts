import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// La compuerta «producto» trae una pregunta por decisión (`preguntas:` en compuerta.md) y la sesión de decidir las hace en tandas
// de hasta 4 (`AskUserQuestion` admite de 1 a 4). El hook anota cada tanda en `decision-parcial-<id>.json` y escribe `decision.md`
// sólo cuando están todas: el bucle acepta una decisión entera o ninguna. En el 4.13-3b llegaron P0–P9 en una sola pregunta.
const SCRIPT = resolve('scripts/piloto/anotar-decision.sh')

let raiz = ''
let comun = ''
const raices: string[] = []

const PREGUNTAS = [
  ['P0', '¿Partir el paso en 3c y 3d?'],
  ['P1', '¿Qué se ve al guardar?'],
  ['P2', '¿Dónde va el aviso D2?'],
  ['P3', '¿Qué dice el aviso de repetido?'],
  ['P4', '¿El borrador se repone solo?'],
] as const

const COMPUERTA = [
  'id: g-7',
  'creada: 1',
  'tipo: producto',
  'paso: 4.13-3c',
  'motivo: el plan deja cinco decisiones abiertas',
  'pregunta: el plan deja cinco decisiones abiertas',
  'opciones:',
  'contexto:',
  '- .piloto/planes/4.13-3c.md',
  'preguntas: 5',
  'tandas: 2',
  ...PREGUNTAS.flatMap(([id, texto]) => [
    `- ${id}: ${texto}`,
    '  - sí — la recomendada',
    '  - no — la otra',
  ]),
  '',
].join('\n')

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'anotar-tandas-'))
  raices.push(raiz)
  comun = join(raiz, 'comun')
  mkdirSync(comun)
  writeFileSync(join(comun, 'compuerta.md'), COMPUERTA)
})
afterAll(() => {
  for (const r of raices) rmSync(r, { recursive: true, force: true })
})

type Pregunta = readonly [string, string]
const entrada = (preguntas: readonly Pregunta[], respuestas: string[], cabecera = true) => ({
  hook_event_name: 'PostToolUse',
  tool_name: 'AskUserQuestion',
  tool_input: {
    questions: preguntas.map(([id, texto]) => ({
      question: texto,
      ...(cabecera ? { header: id } : {}),
      multiSelect: false,
      options: [
        { label: 'sí (Recommended)', description: 'la recomendada' },
        { label: 'no', description: 'la otra' },
      ],
    })),
  },
  tool_response: {
    answers: Object.fromEntries(preguntas.map(([, texto], i) => [texto, respuestas[i] ?? ''])),
  },
})

function anotar(e: unknown) {
  return spawnSync('bash', [SCRIPT], {
    input: JSON.stringify(e),
    encoding: 'utf8',
    env: {
      NODE_ENV: 'test',
      PATH: process.env['PATH'] ?? '',
      PILOTO_COMUN: comun,
      PILOTO_SESION: 'decidir',
    },
  })
}

const hayDecision = () => existsSync(join(comun, 'decision.md'))
const decision = () => readFileSync(join(comun, 'decision.md'), 'utf8')

describe('anotar-decision.sh › una compuerta con varias preguntas, en tandas', () => {
  it('tras la primera tanda no hay decisión; tras la segunda, una línea por decisión, en su orden', () => {
    const r = anotar(
      entrada(PREGUNTAS.slice(0, 4), ['sí (Recommended)', 'no', 'sí (Recommended)', 'no']),
    )
    expect(r.status, r.stderr).toBe(0)
    expect(hayDecision()).toBe(false)
    anotar(entrada(PREGUNTAS.slice(4), ['sí (Recommended)']))
    const texto = decision()
    expect(texto).toContain('id: g-7\n')
    expect(texto).toContain(
      'respuestas:\n- P0: sí (Recommended)\n- P1: no\n- P2: sí (Recommended)\n- P3: no\n- P4: sí (Recommended)\n',
    )
    expect(texto).toContain(
      'opcion: P0: sí (Recommended) · P1: no · P2: sí (Recommended) · P3: no · P4: sí (Recommended)\n',
    )
    expect(texto).toContain(
      'me respondió: «P0: sí (Recommended); P1: no; P2: sí (Recommended); P3: no; P4: sí (Recommended)»',
    )
    expect(existsSync(join(comun, 'decision-parcial-g-7.json'))).toBe(false)
  })

  it('lo escrito en «Other» queda literal, y las notas van con su decisión', () => {
    const e = entrada(PREGUNTAS.slice(0, 4), [
      'sí (Recommended)',
      'volver a returnTo, con ; y «comillas»',
      'no',
      'no',
    ])
    ;(e.tool_response as Record<string, unknown>)['annotations'] = {
      [PREGUNTAS[1][1]]: { notes: 'sólo en el celular' },
    }
    anotar(e)
    anotar(entrada(PREGUNTAS.slice(4), ['no']))
    expect(decision()).toContain('- P1: volver a returnTo, con ; y «comillas»\n')
    expect(decision()).toContain('notas: P1: sólo en el celular')
  })

  it('con header, la respuesta vale aunque la sesión haya acortado la pregunta para el celular', () => {
    const cortas = PREGUNTAS.map(([id, texto]) => [id, `${texto.slice(0, 8)}…`] as const)
    anotar(entrada(cortas.slice(0, 4), ['a', 'b', 'c', 'd']))
    anotar(entrada(cortas.slice(4), ['e']))
    expect(decision()).toContain('- P0: a\n- P1: b\n- P2: c\n- P3: d\n- P4: e\n')
  })

  it('sin header, cada respuesta se empareja por el texto de su pregunta', () => {
    anotar(
      entrada(
        [PREGUNTAS[3], PREGUNTAS[0], PREGUNTAS[2], PREGUNTAS[1]],
        ['a', 'b', 'c', 'd'],
        false,
      ),
    )
    anotar(entrada([PREGUNTAS[4]], ['e'], false))
    expect(decision()).toContain('- P0: b\n- P1: d\n- P2: c\n- P3: a\n- P4: e\n')
  })
})

describe('anotar-decision.sh › lo que no cuenta, o cuenta distinto', () => {
  it('si la sesión vuelve a preguntar una decisión, vale la última respuesta', () => {
    anotar(entrada(PREGUNTAS.slice(0, 4), ['sí', 'sí', 'sí', 'sí']))
    anotar(entrada([PREGUNTAS[1], PREGUNTAS[4]], ['no', 'sí']))
    expect(decision()).toContain('- P1: no\n')
    expect(decision().match(/^- P1:/gm)).toHaveLength(1)
  })

  it('una respuesta de texto («"pregunta"="respuesta"») también se empareja', () => {
    anotar({
      ...entrada(PREGUNTAS.slice(0, 4), []),
      tool_response: `User has answered your questions: ${PREGUNTAS.slice(0, 4)
        .map(([, t], i) => `"${t}"="r${i}"`)
        .join(', ')}. You can now continue.`,
    })
    anotar(entrada(PREGUNTAS.slice(4), ['r4']))
    expect(decision()).toContain('- P0: r0\n- P1: r1\n- P2: r2\n- P3: r3\n- P4: r4\n')
  })

  it('lo anotado para otra compuerta no cuenta: la decisión es sólo de la vigente', () => {
    writeFileSync(join(comun, 'decision-parcial-g-6.json'), '{"P4":{"r":"viejo","n":""}}')
    anotar(entrada(PREGUNTAS.slice(0, 4), ['a', 'b', 'c', 'd']))
    expect(hayDecision()).toBe(false)
  })

  it('una pregunta que no es de la compuerta no se anota', () => {
    anotar(
      entrada(
        [...PREGUNTAS.slice(0, 3), ['P9', '¿Algo que no se preguntó?'] as const],
        ['a', 'b', 'c', 'x'],
      ),
    )
    anotar(entrada(PREGUNTAS.slice(3), ['d', 'e']))
    expect(decision()).not.toContain('P9')
    expect(decision()).toContain('- P4: e\n')
  })
})
