import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arnes, pasoCompuerta, pasoListo, responder, RUTEO_BASE } from './bucle.arnes'

// Las paradas que el bucle decide solo, sin el modelo: las deterministas (disco, rama, árbol, CI) y las que no le deja al ruteo
// (4.18, 4.28, abrir una fase, y el plan de los pasos de datos y seguridad en la mano).
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = new Arnes()
})
afterEach(() => a.limpiar())

describe('bucle.sh › las paradas deterministas', () => {
  it('disco por encima del tope: aviso antes de rutear (nada gasta)', () => {
    a.decidir(1, responder('parado'))
    const r = a.correr([], { PILOTO_DISCO_MAX: '1' })
    expect(r.estado).toBe(0)
    expect(a.secuencia()).toEqual(['decidir:abrir parada ', 'decidir:cerrar'])
    expect(a.leerFake('compuerta-1.md')).toMatch(/motivo: el disco está al \d+ % \(tope 1 %/)
    expect(a.llamadas('ruteo')).toEqual([])
  })

  it('«sigo» ignora el aviso una vez y la vuelta sigue', () => {
    a.decidir(1, responder('sigo'))
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'], { PILOTO_DISCO_MAX: '1' })
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia()).toEqual([
      'decidir:abrir parada ',
      'decidir:cerrar',
      'verificar:copia',
      'publicar:4.99',
    ])
  })

  it('una rama que no es main es un aviso', () => {
    a.git('checkout', '-q', '-b', 'otra')
    a.decidir(1, responder('parado'))
    a.correr()
    expect(a.leerFake('compuerta-1.md')).toContain('la rama es «otra», no main')
    expect(a.llamadas('ruteo')).toEqual([])
  })

  it('un árbol sucio sin un paso en curso es un aviso; con un paso en curso no', () => {
    a.escribirRepo('suelto.txt', 'x')
    a.decidir(1, responder('parado'))
    a.correr()
    expect(a.leerFake('compuerta-1.md')).toContain('el árbol está sucio y no hay un paso en curso')
  })

  it('el último CI de main en rojo es un aviso', () => {
    a.decidir(1, responder('parado'))
    a.correr([], {
      FAKE_GH_LISTA: '[{"databaseId":1,"status":"completed","conclusion":"failure","headSha":"x"}]',
    })
    expect(a.leerFake('compuerta-1.md')).toContain('el último CI de main está en rojo')
    expect(a.llamadas('ruteo')).toEqual([])
  })

  it('un CI en curso no para al bucle', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'], {
      FAKE_GH_LISTA: '[{"databaseId":1,"status":"in_progress","conclusion":null,"headSha":"x"}]',
    })
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia()).toEqual(['verificar:copia', 'publicar:4.99'])
  })
})

describe('bucle.sh › lo que no se le deja al modelo', () => {
  it.each(['4.18', '4.28', '4.18-2'])('el paso %s es un aviso, y el paso no corre', (paso) => {
    a.ruteo({ ...RUTEO_BASE, paso })
    a.decidir(1, responder('parado'))
    const r = a.correr()
    expect(r.estado).toBe(0)
    expect(a.secuencia()[0]).toBe(`decidir:abrir parada ${paso}`)
    expect(a.llamadas('paso')).toEqual([])
  })

  it('abrir una fase es un aviso', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '5.01', compuerta: { tipo: 'fase', motivo: 'abre la Fase 5' } })
    a.decidir(1, responder('parado'))
    a.correr()
    expect(a.llamadas('paso')).toEqual([])
    expect(a.leerFake('compuerta-1.md')).toContain('abre una fase')
  })

  it('«sigo» en un aviso de 4.18 corre el paso; «reintentar» vuelve a rutear sin correrlo', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.18' })
    a.decidir(1, responder('sigo'))
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }, { paso: '4.18' }))
    expect(a.correr(['--hasta', '4.18']).estado).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('una compuerta de producto o dependencia que ve el ruteo se pregunta antes de gastar el paso', () => {
    a.ruteo(
      { ...RUTEO_BASE, compuerta: { tipo: 'producto', motivo: '¿el aviso va arriba o abajo?' } },
      1,
    )
    a.decidir(1, responder('parar'))
    const r = a.correr()
    expect(r.estado).toBe(0)
    expect(a.secuencia()[0]).toBe('decidir:abrir producto 4.99')
    expect(a.llamadas('paso')).toEqual([])
  })
})

describe('bucle.sh › una compuerta del ruteo no deja un paso «en curso» que nunca empezó', () => {
  it('contestada, la vuelta siguiente abre una sesión nueva (no un --resume de una sesión que no existe)', () => {
    a.ruteo(
      { ...RUTEO_BASE, compuerta: { tipo: 'producto', motivo: '¿el aviso va arriba o abajo?' } },
      1,
    )
    a.decidir(1, responder('seguir con la recomendación'))
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
    expect(a.llamadas('paso')[0]).toContain('--session-id')
    expect(a.llamadas('paso')[0]).not.toContain('--resume')
    expect(a.secuencia()).toEqual([
      'decidir:abrir producto 4.99',
      'decidir:cerrar',
      'verificar:copia',
      'publicar:4.99',
    ])
  })
})

describe.each(['4.15', '4.24', '4.25', '4.26', '4.27'])(
  'bucle.sh › el paso de datos %s',
  (paso) => {
    beforeEach(() => a.ruteo({ ...RUTEO_BASE, paso }))

    it('corre hasta el plan: la compuerta de datos se decide con el plan en la mano', () => {
      a.paso(1, pasoCompuerta('datos', { paso }))
      a.decidir(1, responder('parar'))
      a.correr()
      expect(a.llamadas('paso')[0]).toContain(`-p /piloto ${paso} --hasta-plan `)
    })

    it('con la aprobación de la persona ya escrita, el paso sigue sin --hasta-plan', () => {
      mkdirSync(a.comun, { recursive: true })
      writeFileSync(join(a.comun, `aprobado-${paso}`), 'ok\n')
      a.paso(1, pasoListo({ 'src/a.ts': 'a' }, { paso }))
      a.correr(['--hasta', paso])
      expect(a.llamadas('paso')[0]).not.toContain('--hasta-plan')
    })
  },
)

describe('bucle.sh › un paso que no es de datos', () => {
  it('no lleva --hasta-plan', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    a.correr(['--hasta', '4.99'])
    expect(a.llamadas('paso')[0]).not.toContain('--hasta-plan')
  })
})

// Un paso de Nivel 2 corre `pnpm test:e2e:completo`, que exige las funciones edge; el bucle no las levanta. Sin ellas el paso caía a
// mitad de camino, después de gastar el plan y la ejecución: se avisa antes de lanzarlo (CAL-1).
describe('bucle.sh › las funciones edge, antes de un paso de Nivel 2', () => {
  const nivel2 = { nivel: 2, disparadores: ['shared'], cuenta_e2e: 1, completo: false }

  it('Nivel 2 y una función caída: aviso antes de gastar el paso, con lo que hay que correr', () => {
    a.ruteo({ ...RUTEO_BASE, nivel: nivel2 })
    a.caerFunciones('storage-gc', 'avatares-miniaturas')
    a.decidir(1, responder('parado'))
    const r = a.correr()
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toEqual([])
    const c = a.leerFake('compuerta-1.md')
    expect(c).toContain('tipo: parada')
    expect(c).toContain('faltan las funciones edge (storage-gc, avatares-miniaturas)')
    expect(c).toContain('npx supabase functions serve')
    expect(a.estado('en-curso.json')).toBe('')
  })

  it('«reintentar» vuelve a mirar: con las funciones servidas, el paso corre', () => {
    a.ruteo({ ...RUTEO_BASE, nivel: nivel2 })
    a.caerFunciones('apibara')
    a.decidir(1, `rm -f "$FAKE_DIR/funciones-caidas"\n${responder('reintentar')}`)
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    expect(a.correr(['--hasta', '4.99']).estado).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('«reintentar» con las funciones todavía caídas vuelve a avisar, sin correr el paso', () => {
    a.ruteo({ ...RUTEO_BASE, nivel: nivel2 })
    a.caerFunciones('apibara')
    a.decidir(1, responder('reintentar'))
    a.decidir(2, responder('parado'))
    expect(a.correr().estado).toBe(0)
    expect(a.llamadas('paso')).toEqual([])
    expect(a.leerFake('compuerta-2.md')).toContain('faltan las funciones edge (apibara)')
  })

  it('el e2e completo de un paso de pantalla (la cuenta) también las pide', () => {
    a.ruteo({ ...RUTEO_BASE, nivel: { ...RUTEO_BASE.nivel, completo: true } })
    a.caerFunciones('apibara')
    a.decidir(1, responder('parado'))
    a.correr()
    expect(a.llamadas('paso')).toEqual([])
  })

  it('un paso de Nivel 1 sin completo no las pide', () => {
    a.caerFunciones('apibara', 'storage-gc', 'avatares-miniaturas')
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    expect(a.correr(['--hasta', '4.99']).estado).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('«sigo» corre el paso igual', () => {
    a.ruteo({ ...RUTEO_BASE, nivel: nivel2 })
    a.caerFunciones('apibara')
    a.decidir(1, responder('sigo'))
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    expect(a.correr(['--hasta', '4.99']).estado).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
  })
})
