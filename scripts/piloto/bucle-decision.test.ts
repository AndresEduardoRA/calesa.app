import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arnes, pasoCompuerta, pasoListo, responder, RUTEO_BASE } from './bucle.arnes'

// Lo que el bucle le exige a una decisión para aceptarla [cambio 2], cómo retoma un paso a medias [cambio 3] y por qué corre una copia de
// sus piezas y no las del árbol [cambio 6]; y el límite de uso y el ensayo en seco. Con los mismos falsos de `bucle.arnes.ts`.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = new Arnes()
})
afterEach(() => a.limpiar())

const SIN_ESTADO = '$PILOTO_RAIZ/.piloto/en-curso.json'

describe('bucle.sh › [cambio 2] una decisión sólo vale si es de esta compuerta, posterior y sin un paso vivo', () => {
  beforeEach(() => {
    a.paso(1, pasoCompuerta('datos'))
    a.paso(2, pasoListo({ 'src/a.ts': 'a' }))
  })

  it('la buena se acepta y escribe aprobado-<paso>', () => {
    a.decidir(1, responder('aprobar'))
    expect(a.correr(['--hasta', '4.99']).estado).toBe(0)
    expect(a.estado('registro.md')).not.toContain('decisión rechazada')
    expect(a.estado('registro.md')).toContain('me respondió: «aprobar»')
    expect(a.leerFake('secuencia.log')).toContain('publicar:4.99')
  })

  it('con el id de otra compuerta se rechaza, se borra y se sigue esperando', () => {
    a.decidir(
      1,
      `sleep 0.3
printf 'id: g-de-otra\\nopcion: aprobar\\ncreada: 1\\nme respondió: «aprobar»\\n' > "$COMUN/decision.md"
sleep 0.6
${responder('parar')}`,
    )
    a.correr(['--hasta', '4.99'])
    expect(a.estado('registro.md')).toContain('decisión rechazada: el id es de otra compuerta')
    expect(a.leerFake('secuencia.log')).not.toContain('publicar:4.99')
  })

  it('anterior a compuerta.md se rechaza', () => {
    a.decidir(
      1,
      `sleep 0.3
printf 'id: %s\\nopcion: aprobar\\ncreada: 1\\nme respondió: «aprobar»\\n' "$ID" > "$COMUN/decision.md"
touch -d '2001-01-01 00:00:00' "$COMUN/decision.md"
sleep 0.6
${responder('aprobar')}`,
    )
    a.correr(['--hasta', '4.99'])
    expect(a.estado('registro.md')).toContain('decisión rechazada: es anterior a la compuerta')
    expect(a.leerFake('secuencia.log')).toContain('publicar:4.99')
  })

  it('creada con un paso vivo se rechaza (aunque el id y la hora sean los buenos); la de después, sin paso vivo, vale', () => {
    a.decidir(
      1,
      `sleep 30 & P=$!
jq -c ".pid = $P" "${SIN_ESTADO}" > "${SIN_ESTADO}.t" && mv -f "${SIN_ESTADO}.t" "${SIN_ESTADO}"
sleep 0.3
printf 'id: %s\\nopcion: parar\\ncreada: %s\\nme respondió: «parar»\\n' "$ID" "$(date +%s)" > "$COMUN/decision.md"
sleep 0.6
kill $P
jq -c ".pid = null" "${SIN_ESTADO}" > "${SIN_ESTADO}.t" && mv -f "${SIN_ESTADO}.t" "${SIN_ESTADO}"
${responder('aprobar')}`,
    )
    a.correr(['--hasta', '4.99'])
    expect(a.estado('registro.md')).toContain('decisión rechazada: apareció con un paso vivo')
    expect(a.leerFake('secuencia.log')).toContain('publicar:4.99')
  })

  it('sin respuesta no sigue: con PILOTO_ESPERA_MAX cierra la sesión de decidir y sale con 3', () => {
    const r = a.correr(['--hasta', '4.99'], { PILOTO_ESPERA_MAX: '1' })
    expect(r.estado).toBe(3)
    expect(a.llamadas('paso')).toHaveLength(1)
    expect(a.secuencia().at(-1)).toBe('decidir:cerrar')
  })
})

describe('bucle.sh › [cambio 3] un paso que falla o queda a medias se retoma con su sesión', () => {
  it('un fallo del proceso: un reintento con --resume y el mismo session_id', () => {
    a.paso(1, 'true', { salida_codigo: 1 })
    a.paso(2, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    const [primero, segundo] = a.llamadas('paso')
    const sesion = /--session-id (\S+)/.exec(primero ?? '')?.[1]
    expect(segundo).toContain(`--resume ${sesion}`)
    expect(segundo).toContain('-p /piloto 4.99 continuar')
    expect(segundo).not.toContain('--session-id')
    expect(a.estado('consumo.csv')).toContain('fallo-proceso')
  })

  it('sin un ultimo.json válido, aunque el proceso salga bien, también es un fallo', () => {
    a.paso(1, 'true')
    a.paso(2, pasoListo({ 'src/a.ts': 'a' }))
    a.correr(['--hasta', '4.99'])
    expect(a.llamadas('paso')[1]).toContain('--resume')
  })

  it('si el reintento vuelve a fallar: aviso, y nunca una sesión nueva', () => {
    a.paso(1, 'true', { salida_codigo: 1 })
    a.paso(2, 'true', { salida_codigo: 1 })
    a.decidir(1, responder('parado'))
    const r = a.correr()
    expect(r.estado).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(2)
    expect(a.llamadas('paso').filter((l) => l.includes('--session-id'))).toHaveLength(1)
    expect(a.secuencia()[0]).toBe('decidir:abrir parada 4.99')
    expect(a.estado('fallas').trim()).toBe('1')
  })

  it('un paso a medias tras un reinicio se retoma con --resume de su sesión, diga lo que diga el ruteo', () => {
    a.ruteo({
      ...RUTEO_BASE,
      paso: '4.77',
      modelo: 'sonnet',
      sesion: { tipo: 'nueva', session_id: null },
    })
    mkdirSync(join(a.repo, '.piloto'), { recursive: true })
    writeFileSync(
      join(a.repo, '.piloto/en-curso.json'),
      JSON.stringify({
        paso: '4.50',
        session_id: 'sesion-vieja',
        pid: 999_999,
        head_arranque: a.git('rev-parse', 'HEAD'),
        hora: 'x',
        modelo: 'opus',
        effort: 'high',
        estado: 'corriendo',
      }),
    )
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }, { paso: '4.50' }))
    const r = a.correr(['--hasta', '4.50'])
    expect(r.estado, r.salida).toBe(0)
    const [llamada] = a.llamadas('paso')
    expect(llamada).toContain('-p /piloto 4.50 continuar --model opus --effort high')
    expect(llamada).toContain('--resume sesion-vieja')
    expect(llamada).not.toContain('--session-id')
    expect(a.secuencia()).toContain('publicar:4.50')
  })

  it('si el paso a medias sigue vivo, no se lanza otro encima: aviso', () => {
    mkdirSync(join(a.repo, '.piloto'), { recursive: true })
    writeFileSync(
      join(a.repo, '.piloto/en-curso.json'),
      JSON.stringify({
        paso: '4.50',
        session_id: 's',
        pid: process.pid,
        head_arranque: 'x',
        estado: 'corriendo',
      }),
    )
    a.decidir(1, responder('parado'))
    a.correr()
    expect(a.llamadas('paso')).toEqual([])
    expect(a.leerFake('compuerta-1.md')).toContain('sigue vivo')
  })
})

describe('bucle.sh › [cambio 6] el bucle corre su copia, no el árbol', () => {
  it('un byte cambiado en la copia es un aviso antes de rutear', () => {
    writeFileSync(join(a.bin, 'hechos.sh'), `${a.leerBin('hechos.sh')} `)
    a.decidir(1, responder('parado'))
    a.correr()
    expect(a.llamadas('ruteo')).toEqual([])
    expect(a.leerFake('compuerta-1.md')).toContain('bin.sha256')
  })

  it.each([
    ['un archivo de más', (b: string) => writeFileSync(join(b, 'extra.sh'), 'echo mal\n')],
    ['una carpeta de más', (b: string) => mkdirSync(join(b, 'oculta'))],
    ['sin bin.sha256', (b: string) => writeFileSync(join(b, 'bin.sha256'), '')],
  ])('%s es un aviso antes de rutear', (_nombre, alterar) => {
    alterar(a.bin)
    a.decidir(1, responder('parado'))
    a.correr()
    expect(a.llamadas('ruteo')).toEqual([])
    expect(a.secuencia()[0]).toBe('decidir:abrir parada ')
  })

  it('un paso que reescribe verificar.sh: salta «guardas» antes de verificar; aprobada, la vuelta termina y pide re-arrancar sin publicar', () => {
    a.paso(1, pasoListo({ 'scripts/piloto/verificar.sh': 'echo "nueva versión"' }))
    a.decidir(1, responder('aprobar'))
    a.decidir(2, responder('parado'))
    const r = a.correr()
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia()).toEqual([
      'decidir:abrir guardas 4.99',
      'decidir:cerrar',
      'decidir:abrir parada 4.99',
      'decidir:cerrar',
    ])
    expect(a.leerFake('compuerta-2.md')).toContain('re-arranca')
    expect(a.leerFake('repo-ejecutado')).toBe('')
    expect(a.estado('registro.md')).toContain('re-arrancar: 4.99 queda en «listo»')
  })

  it('tras re-arrancar con --hasta, llegar a ese paso termina el bucle', () => {
    a.paso(1, pasoListo({ 'scripts/piloto/verificar.sh': 'echo "nueva versión"' }))
    a.decidir(1, responder('aprobar'))
    a.decidir(2, responder('parado'))
    a.correr()
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('llegamos a 4.99')
    expect(a.llamadas('ruteo')).toHaveLength(1)
  })

  it('tras re-arrancar, la vuelta siguiente verifica y publica sin volver a preguntar las guardas', () => {
    a.paso(1, pasoListo({ 'scripts/piloto/verificar.sh': 'echo "nueva versión"' }))
    a.decidir(1, responder('aprobar'))
    a.decidir(2, responder('parado'))
    a.correr()
    const r = a.correr(['--una-vuelta'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia().slice(-2)).toEqual(['verificar:copia', 'publicar:4.99'])
    expect(a.llamadas('paso')).toHaveLength(1)
  })
})

describe('bucle.sh › el límite de uso', () => {
  const LIMITE = {
    type: 'result',
    is_error: true,
    result: "You've hit your session limit · resets 3:45pm",
    session_id: 'fake',
  }

  it('duerme hasta esa hora, retoma una vez con --resume, y no suma una falla', () => {
    a.paso(1, 'true', { salida: LIMITE, salida_codigo: 1 })
    a.paso(2, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    const [segundos] = a.lineas('dormir.log')
    expect(Number(segundos)).toBeGreaterThanOrEqual(300)
    expect(Number(segundos)).toBeLessThanOrEqual(86_400 + 300)
    expect(a.llamadas('paso')[1]).toContain('--resume')
    expect(a.estado('consumo.csv')).toContain(',limite')
    expect(a.estado('fallas').trim()).toBe('0')
  })

  it('si el límite vuelve tras dormir: aviso', () => {
    a.paso(1, 'true', { salida: LIMITE, salida_codigo: 1 })
    a.paso(2, 'true', { salida: LIMITE, salida_codigo: 1 })
    a.decidir(1, responder('parado'))
    a.correr()
    expect(a.lineas('dormir.log')).toHaveLength(1)
    expect(a.llamadas('paso')).toHaveLength(2)
    expect(a.secuencia()[0]).toBe('decidir:abrir parada 4.99')
  })

  it('sin hora legible duerme 60 minutos', () => {
    a.paso(1, 'true', {
      salida: { ...LIMITE, result: "You've hit your weekly limit" },
      salida_codigo: 1,
    })
    a.paso(2, pasoListo({ 'src/a.ts': 'a' }))
    a.correr(['--hasta', '4.99'])
    expect(a.lineas('dormir.log')).toEqual(['3600'])
  })

  it('también en el ruteo: duerme y lo repite', () => {
    a.ruteo(RUTEO_BASE, 2)
    writeFileSync(join(a.fake, 'ruteo-1.json'), JSON.stringify(LIMITE))
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    expect(a.correr(['--hasta', '4.99']).estado).toBe(0)
    expect(a.lineas('dormir.log')).toHaveLength(1)
    expect(a.llamadas('ruteo')).toHaveLength(2)
  })
})

describe('bucle.sh › el ensayo en seco', () => {
  it('un ruteo real y el paso sin ejecutar nada: sin decidir, sin verificar, sin publicar', () => {
    const nota = join(a.raiz, 'nota.md')
    writeFileSync(nota, 'el 3a está en curso en otra sesión')
    const r = a.correr(['--en-seco', '--nota', nota], { PILOTO_DISCO_MAX: '1' })
    expect(r.estado, r.salida).toBe(0)
    const [paso] = a.llamadas('paso')
    expect(paso).toContain('-p /piloto 4.99 --en-seco')
    expect(paso).toContain('--permission-mode dontAsk --permission-prompts none')
    expect(paso).toContain('--allowedTools Read Grep Glob Agent')
    expect(paso).toContain('Write(.piloto/**) Edit(.piloto/**)')
    expect(paso).not.toContain('--permission-mode auto')
    expect(a.secuencia()).toEqual([])
    expect(r.salida).toContain('"paso": "4.99"')
    expect(r.salida).toContain('AVISO (en seco, sigo): el disco está al')
    expect(a.estado('nota-en-seco.md')).toBe('el 3a está en curso en otra sesión')
    expect(a.estado('en-curso.json')).toBe('')
    expect(a.estado('consumo.csv')).toContain(',paso-en-seco,')
  })
})
