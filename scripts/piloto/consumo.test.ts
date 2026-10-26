import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// `consumo.sh` agrega una línea por llamada a `.piloto/consumo.csv`. Los tokens son la suma de `modelUsage` (que incluye a los
// subagentes: `usage` no); con `--resume` el JSON acumula toda la sesión, así que se resta lo que esa sesión ya llevaba
// (`.piloto/sesiones/<session_id>.json`). La sesión de decidir es interactiva y sin JSON: se cuenta el transcript, sin dólares.
const SCRIPT = resolve('scripts/piloto/consumo.sh')
const CABECERA =
  'fecha,llamada,paso,modelo,effort,session_id,tokens_entrada,tokens_salida,tokens_cache_lectura,tokens_cache_escritura,tokens,total_cost_usd,duracion_s,resultado'

let dir = ''
const dirs: string[] = []

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'consumo-'))
  dirs.push(dir)
})
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
})

// Tokens de entrada, salida, caché leída, caché escrita y dólares, en ese orden.
const uso = (...n: [number, number, number, number, number]) => ({
  inputTokens: n[0],
  outputTokens: n[1],
  cacheReadInputTokens: n[2],
  cacheCreationInputTokens: n[3],
  costUSD: n[4],
})

function llamada(sesion: string, usd: number, modelUsage: Record<string, unknown>, ms = 90_000) {
  const archivo = join(dir, `salida-${String(Math.random()).slice(2)}.json`)
  writeFileSync(
    archivo,
    JSON.stringify({
      type: 'result',
      session_id: sesion,
      total_cost_usd: usd,
      duration_ms: ms,
      modelUsage,
    }),
  )
  return archivo
}

function correr(...args: string[]) {
  return spawnSync('bash', [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { NODE_ENV: 'test', PATH: process.env['PATH'] ?? '', PILOTO_DIR: dir },
  })
}

const lineas = () => readFileSync(join(dir, 'consumo.csv'), 'utf8').trim().split('\n')
const campos = (linea: string | undefined) => (linea ?? '').split(',')

describe('consumo.sh › una llamada con JSON', () => {
  it('escribe la cabecera y una línea con los tokens sumados de todos los modelos', () => {
    const json = llamada('s-1', 1.5, {
      'claude-sonnet-5-5': uso(1000, 200, 5000, 300, 0.5),
      'claude-opus-5-5': uso(10, 20, 30, 40, 1.0),
    })
    const r = correr('llamada', 'paso', '4.13-3b', 'sonnet', 'high', 'listo', json)
    expect(r.status, r.stderr).toBe(0)
    const [cabecera, fila] = lineas()
    expect(cabecera).toBe(CABECERA)
    const c = campos(fila)
    expect(c[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(c.slice(1)).toEqual([
      'paso',
      '4.13-3b',
      'sonnet',
      'high',
      's-1',
      '1010',
      '220',
      '5030',
      '340', // entrada, salida, cache lectura, cache escritura
      '6600', //  la suma de las cuatro
      '1.5',
      '90',
      'listo',
    ])
  })

  it('guarda el JSON entero en llamadas/ y la cabecera sólo una vez', () => {
    const json = llamada('s-1', 1, { m: uso(1, 1, 1, 1, 1) })
    correr('llamada', 'ruteo', '-', 'sonnet', 'low', 'listo', json)
    correr('llamada', 'ruteo', '-', 'sonnet', 'low', 'listo', json)
    expect(lineas().filter((l) => l.startsWith('fecha,'))).toHaveLength(1)
    const guardados = readdirSync(join(dir, 'llamadas'))
    expect(guardados.length).toBeGreaterThanOrEqual(1)
    expect(guardados[0]).toMatch(/^\d{8}T\d{6}.*-ruteo\.json$/)
    expect(
      JSON.parse(readFileSync(join(dir, 'llamadas', guardados[0] ?? ''), 'utf8')).session_id,
    ).toBe('s-1')
  })
})

describe('consumo.sh › una sesión que se retoma (--resume)', () => {
  it('con --resume resta lo que la sesión ya llevaba: el JSON acumula, la línea no', () => {
    correr(
      'llamada',
      'paso',
      '4.13-3b',
      'opus',
      'high',
      'compuerta',
      llamada('s-9', 2, { m: uso(100, 50, 1000, 10, 2) }),
    )
    const segunda = llamada('s-9', 5, { m: uso(160, 90, 1700, 10, 5) }, 30_000)
    correr('llamada', 'paso', '4.13-3b', 'opus', 'high', 'listo', segunda)
    const c = campos(lineas()[2])
    expect(c.slice(6, 14)).toEqual(['60', '40', '700', '0', '800', '3', '30', 'listo'])
  })

  it('guarda los totales de la sesión para la próxima resta', () => {
    correr(
      'llamada',
      'paso',
      'x',
      'opus',
      'high',
      'listo',
      llamada('s-2', 4, { m: uso(7, 8, 9, 10, 4) }),
    )
    const guardado = JSON.parse(readFileSync(join(dir, 'sesiones/s-2.json'), 'utf8'))
    expect(guardado).toMatchObject({
      entrada: 7,
      salida: 8,
      cache_lectura: 9,
      cache_escritura: 10,
      usd: 4,
    })
  })

  it('una sesión nueva no resta nada, aunque otra ya exista', () => {
    correr(
      'llamada',
      'paso',
      'x',
      'opus',
      'high',
      'listo',
      llamada('s-a', 4, { m: uso(100, 100, 100, 100, 4) }),
    )
    correr(
      'llamada',
      'paso',
      'x',
      'opus',
      'high',
      'listo',
      llamada('s-b', 1, { m: uso(1, 2, 3, 4, 1) }),
    )
    expect(campos(lineas()[2]).slice(6, 12)).toEqual(['1', '2', '3', '4', '10', '1'])
  })

  it('un JSON sin modelUsage deja ceros y no tumba al bucle', () => {
    const archivo = join(dir, 'solo.json')
    writeFileSync(archivo, JSON.stringify({ session_id: 's-3', total_cost_usd: 0.1 }))
    const r = correr('llamada', 'ruteo', '-', 'sonnet', 'low', 'falla', archivo)
    expect(r.status).toBe(0)
    expect(campos(lineas()[1]).slice(6, 12)).toEqual(['0', '0', '0', '0', '0', '0.1'])
  })

  it('un archivo que no es JSON no escribe nada y avisa por stderr (sin romper al bucle)', () => {
    const archivo = join(dir, 'roto.json')
    writeFileSync(archivo, 'no es json')
    const r = correr('llamada', 'ruteo', '-', 'sonnet', 'low', 'falla', archivo)
    expect(r.status).toBe(0)
    expect(r.stderr).toContain('consumo')
    expect(existsSync(join(dir, 'consumo.csv'))).toBe(false)
  })
})

describe('consumo.sh › la sesión de decidir (transcript, sin dólares)', () => {
  it('suma el uso de los mensajes del asistente y deja los dólares vacíos', () => {
    const transcript = join(dir, 'abc-123.jsonl')
    const mensaje = (u: Record<string, number>) =>
      JSON.stringify({ type: 'assistant', message: { usage: u } })
    writeFileSync(
      transcript,
      [
        JSON.stringify({ type: 'user', message: { content: 'hola' } }),
        mensaje({
          input_tokens: 10,
          output_tokens: 5,
          cache_read_input_tokens: 100,
          cache_creation_input_tokens: 20,
        }),
        mensaje({
          input_tokens: 1,
          output_tokens: 2,
          cache_read_input_tokens: 3,
          cache_creation_input_tokens: 4,
        }),
      ].join('\n'),
    )
    const r = correr('transcript', 'decidir', 'datos 4.15', 'sonnet', 'low', 'listo', transcript)
    expect(r.status, r.stderr).toBe(0)
    const c = campos(lineas()[1])
    expect(c.slice(1, 6)).toEqual([
      'decidir',
      'datos 4.15'.replaceAll(',', ' '),
      'sonnet',
      'low',
      'abc-123',
    ])
    expect(c.slice(6, 13)).toEqual(['11', '7', '103', '24', '145', '', ''])
    expect(c[13]).toBe('listo')
  })
})
