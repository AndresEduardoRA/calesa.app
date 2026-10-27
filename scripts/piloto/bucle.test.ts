import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arnes, pasoCompuerta, pasoFalla, pasoListo, responder, RUTEO_BASE } from './bucle.arnes'

// El bucle sin modelo, probado con un `claude` falso (JSON enlatado y un guion por llamada), un `decidir` falso y un `verificar` y un
// `publicar` falsos que sólo registran su orden: lo que decide el bucle, no lo que dirían los modelos. Aquí el flujo de cada vuelta
// y las paradas que el bucle no le deja al modelo; el cierre de un «listo» va en `bucle-cierre.test.ts`, las autorizaciones y el
// proceso que falla en `bucle-decision.test.ts`.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = new Arnes()
})
afterEach(() => a.limpiar())

describe('bucle.sh › un paso listo', () => {
  it('lo verifica y lo publica con la copia, sin que el modelo publique, y llega al paso pedido', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia()).toEqual(['verificar:copia', 'publicar:4.99'])
    expect(existsSync(join(a.repo, '.piloto/en-curso.json'))).toBe(false)
    expect(a.estado('registro.md')).toContain('publicado 4.99')
    expect(a.estado('fallas').trim()).toBe('0')
  })

  it('el ruteo sólo lee y el paso va con auto, sin preguntas, con tope y sesión nueva', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    a.correr(['--hasta', '4.99'])
    const [ruteo] = a.llamadas('ruteo')
    expect(ruteo).toContain(
      '-p /piloto-ruteo --model sonnet --effort low --tools Read,Grep,Glob --disallowedTools mcp__*',
    )
    expect(ruteo).toContain('--disallowedTools mcp__*')
    expect(ruteo).toContain(
      '--permission-mode dontAsk --permission-prompts none --max-turns 25 --max-budget-usd 0.5 ',
    )
    expect(ruteo).toContain('--json-schema')
    const [paso] = a.llamadas('paso')
    expect(paso).toContain(
      '-p /piloto 4.99 --model sonnet --effort medium --permission-mode auto --permission-prompts none',
    )
    expect(paso).toContain(
      '--disallowedTools mcp__* --max-budget-usd 60.00 --output-format json --session-id ',
    )
    expect(paso).not.toContain('--resume')
  })

  it('anota una línea de consumo por llamada, con los tokens de modelUsage', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    a.correr(['--hasta', '4.99'])
    const filas = a.estado('consumo.csv').trim().split('\n')
    expect(filas).toHaveLength(3)
    expect(filas[1]).toContain(',ruteo,')
    const paso = (filas[2] ?? '').split(',')
    expect(paso.slice(1, 4)).toEqual(['paso', '4.99', 'sonnet'])
    // La duración es la del reloj del bucle (el falso tarda menos de un segundo), no la del JSON.
    expect(paso.slice(6, 12)).toEqual(['10', '5', '100', '20', '135', '0.5'])
    expect(paso[12]).toMatch(/^[01]$/)
    expect(paso[13]).toBe('listo')
    expect(paso[14]).toBe('claude-opus-5-5=0.5')
  })

  it('--una-vuelta corre una sola y sale', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    a.paso(2, pasoListo({ 'src/b.ts': 'b' }))
    expect(a.correr(['--una-vuelta']).estado).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
  })
})

describe('bucle.sh › una compuerta del paso', () => {
  beforeEach(() => {
    a.paso(1, pasoCompuerta('datos'))
    a.decidir(1, responder('aprobar'))
    a.paso(2, pasoListo({ 'src/a.ts': 'a' }))
  })

  it('pregunta (decidir), anota la aprobación, vuelve a rutear y retoma con --resume y «continuar»', () => {
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia()).toEqual([
      'decidir:abrir datos 4.99',
      'decidir:cerrar',
      'verificar:copia',
      'publicar:4.99',
    ])
    expect(existsSync(join(a.comun, 'aprobado-4.99'))).toBe(true)
    const [primero, segundo] = a.llamadas('paso')
    const sesion = /--session-id (\S+)/.exec(primero ?? '')?.[1]
    expect(sesion).toMatch(/^[0-9a-f-]{36}$/)
    expect(segundo).toContain('-p /piloto 4.99 continuar')
    expect(segundo).toContain(`--resume ${sesion}`)
    expect(a.llamadas('ruteo')).toHaveLength(2)
  })

  it('la compuerta lleva la pregunta, las opciones con la recomendada primero y las rutas de contexto', () => {
    a.correr(['--hasta', '4.99'])
    const compuerta = a.leerFake('compuerta-1.md')
    expect(compuerta).toMatch(/^id: g-\d+-\d+$/m)
    expect(compuerta).toContain('tipo: datos\npaso: 4.99')
    expect(compuerta).toContain('pregunta: ¿Apruebas el plan?')
    expect(compuerta).toContain('opciones:\n- aprobar — sigue\n- parar — no sigue')
    expect(compuerta).toContain('contexto:\n- .piloto/planes/4.99.md')
  })

  it('«parar» en la compuerta detiene el bucle sin escribir la aprobación', () => {
    a.decidir(1, responder('parar'))
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado).toBe(0)
    expect(existsSync(join(a.comun, 'aprobado-4.99'))).toBe(false)
    expect(a.llamadas('paso')).toHaveLength(1)
    expect(a.secuencia()).not.toContain('publicar:4.99')
  })

  it('lo que la persona escribió (me respondió) llega a hechos.json para que el paso lo lea', () => {
    a.decidir(1, responder('aprobar, pero sin tocar leads'))
    a.correr(['--hasta', '4.99'])
    expect(a.estado('hechos.json')).toContain('me respondió: «aprobar, pero sin tocar leads»')
  })
})

describe('bucle.sh › falla, PARAR y un solo bucle', () => {
  it('una falla del paso es un aviso (compuerta «parada»); «parado» deja el bucle quieto', () => {
    a.paso(1, pasoFalla())
    a.decidir(1, responder('parado'))
    const r = a.correr()
    expect(r.estado).toBe(0)
    expect(a.secuencia()).toEqual(['decidir:abrir parada 4.99', 'decidir:cerrar'])
    expect(a.leerFake('compuerta-1.md')).toContain(
      'opciones:\n- parado — no sigue (recomendado)\n- reintentar — vuelve a intentar esta vuelta\n- sigo — ignora este aviso una vez',
    )
    expect(a.estado('fallas').trim()).toBe('1')
  })

  it('PARAR detiene el bucle entre pasos, antes de rutear', () => {
    mkdirSync(join(a.repo, '.piloto'), { recursive: true })
    writeFileSync(join(a.repo, '.piloto/PARAR'), '')
    const r = a.correr()
    expect(r.estado).toBe(0)
    expect(a.lineas('llamadas.log')).toEqual([])
    expect(r.salida).toContain('PARAR')
  })

  it('un segundo bucle no arranca: el flock de .piloto/bucle.lock lo tiene el primero', async () => {
    mkdirSync(join(a.repo, '.piloto'), { recursive: true })
    const dueno = spawn('flock', [join(a.repo, '.piloto/bucle.lock'), 'sleep', '20'], {
      stdio: 'ignore',
    })
    await new Promise((r) => setTimeout(r, 400))
    try {
      const r = a.correr()
      expect(r.estado).toBe(1)
      expect(r.salida).toContain('ya corre otro bucle')
    } finally {
      dueno.kill()
    }
  })

  it('un paso que ruteo dice «ninguno» termina el bucle', () => {
    a.ruteo({ ...RUTEO_BASE, paso: 'ninguno' })
    const r = a.correr()
    expect(r.estado).toBe(0)
    expect(a.llamadas('paso')).toEqual([])
    expect(a.estado('registro.md')).toContain('ningún paso')
  })
})
