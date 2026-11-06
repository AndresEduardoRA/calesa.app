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

  it.each(['otra', 'main', 'b/notificaciones'])(
    'una rama que no es del carril A (%s) es un aviso',
    (rama) => {
      a.git('checkout', '-q', '-b', rama)
      a.decidir(1, responder('parado'))
      a.correr()
      expect(a.leerFake('compuerta-1.md')).toContain(
        `la rama es «${rama}», no la del carril A (a/…)`,
      )
      expect(a.llamadas('ruteo')).toEqual([])
    },
  )

  it('un árbol sucio sin un paso en curso es un aviso; con un paso en curso no', () => {
    a.escribirRepo('suelto.txt', 'x')
    a.decidir(1, responder('parado'))
    a.correr()
    expect(a.leerFake('compuerta-1.md')).toContain('el árbol está sucio y no hay un paso en curso')
  })

  it('el último CI de la rama en rojo (un job común) no para: se anota y el bucle sigue', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--hasta', '4.99'], {
      FAKE_GH_LISTA: '[{"databaseId":1,"status":"completed","conclusion":"failure","headSha":"x"}]',
      FAKE_GH_JOBS: '{"jobs":[{"name":"e2e · bloque 1","conclusion":"failure"}]}',
    })
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('ruteo')).not.toEqual([])
    expect(a.estado('ci-rojos.md')).toContain('e2e · bloque 1')
  })

  it('el último CI con la base en rojo es un aviso y no sigue', () => {
    a.decidir(1, responder('parado'))
    a.correr([], {
      FAKE_GH_LISTA: '[{"databaseId":1,"status":"completed","conclusion":"failure","headSha":"x"}]',
      FAKE_GH_JOBS:
        '{"jobs":[{"name":"Base · reset, tipos, probar, lint y advisors","conclusion":"failure"}]}',
    })
    expect(a.leerFake('compuerta-1.md')).toContain('base en rojo')
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

describe('bucle.sh › la puerta de fase la decide el CI, no la persona', () => {
  const CI_VERDE = '[{"databaseId":1,"status":"completed","conclusion":"success","headSha":"x"}]'
  const CI_ROJO = '[{"databaseId":2,"status":"completed","conclusion":"failure","headSha":"x"}]'
  const CI_CURSO = '[{"databaseId":3,"status":"in_progress","conclusion":null,"headSha":"x"}]'
  const JOBS_ROJO = '{"jobs":[{"name":"e2e · bloque 1","conclusion":"failure"}]}'

  it.each(['4.18', '4.28', '4.18-2'])(
    'el paso %s con el CI en verde corre sin preguntar',
    (paso) => {
      a.ruteo({ ...RUTEO_BASE, paso })
      a.paso(1, pasoListo({ 'src/a.ts': 'a' }, { paso }))
      const r = a.correr(['--hasta', paso], { FAKE_GH_LISTA: CI_VERDE })
      expect(r.estado, r.salida).toBe(0)
      expect(a.llamadas('paso')).toHaveLength(1)
      expect(a.secuencia().some((l) => l.startsWith('decidir:'))).toBe(false)
    },
  )

  it('una parte que no es la primera (4.18-2) no espera el CI: corre aunque siga en curso', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.18-2' })
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }, { paso: '4.18-2' }))
    const r = a.correr(['--hasta', '4.18-2'], {
      FAKE_GH_LISTA: CI_CURSO,
      PILOTO_CI_ESPERA_MAX: '0',
    })
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('la primera parte (4.18-1) sí espera el CI: en curso tras la espera máxima es un aviso', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.18-1' })
    a.decidir(1, responder('parado'))
    a.correr([], { FAKE_GH_LISTA: CI_CURSO, PILOTO_CI_ESPERA_MAX: '0' })
    expect(a.leerFake('compuerta-1.md')).toContain('sigue corriendo')
    expect(a.llamadas('paso')).toEqual([])
  })

  it('abrir una fase con el CI en verde sigue sin preguntar', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '5.01', compuerta: { tipo: 'fase', motivo: 'abre la Fase 5' } })
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }, { paso: '5.01' }))
    const r = a.correr(['--hasta', '5.01'], { FAKE_GH_LISTA: CI_VERDE })
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
  })

  it('con el CI en rojo, el primer paso es ci-fix y no el 4.18', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.18' }, 1)
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }, { paso: 'ci-fix' }))
    const r = a.correr(['--hasta', 'ci-fix'], { FAKE_GH_LISTA: CI_ROJO, FAKE_GH_JOBS: JOBS_ROJO })
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')[0]).toContain('/piloto ci-fix')
    expect(a.llamadas('ruteo')).toHaveLength(1)
    expect(a.estado('ci-fix-intentos').trim()).toBe('1')
  })

  it('tras 2 intentos de arreglarlo, el CI sigue en rojo: es un aviso', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.18' })
    a.escribirRepo('.piloto/ci-fix-intentos', '2\n')
    a.decidir(1, responder('parado'))
    a.correr([], { FAKE_GH_LISTA: CI_ROJO, FAKE_GH_JOBS: JOBS_ROJO })
    expect(a.leerFake('compuerta-1.md')).toContain('sigue en rojo tras 2 intentos')
    expect(a.llamadas('paso')).toEqual([])
  })

  it('con el CI aún en curso tras la espera máxima: es un aviso', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.18' })
    a.decidir(1, responder('parado'))
    a.correr([], { FAKE_GH_LISTA: CI_CURSO, PILOTO_CI_ESPERA_MAX: '0' })
    expect(a.leerFake('compuerta-1.md')).toContain('sigue corriendo')
    expect(a.llamadas('paso')).toEqual([])
  })

  it('«sigo» en ese aviso corre el paso igual', () => {
    a.ruteo({ ...RUTEO_BASE, paso: '4.18' })
    a.decidir(1, responder('sigo'))
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }, { paso: '4.18' }))
    const r = a.correr(['--hasta', '4.18'], { FAKE_GH_LISTA: CI_CURSO, PILOTO_CI_ESPERA_MAX: '0' })
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')).toHaveLength(1)
  })
})

describe('bucle.sh › los CI rojos acumulados se arreglan antes del paso siguiente', () => {
  const tres = [1, 2, 3].map((n) => `- 2026-11-04 run ${n} (abc): e2e · bloque ${n}\n`).join('')

  it('con 3 rojos anotados, el paso es ci-fix y no se llama al ruteo', () => {
    a.escribirRepo('.piloto/ci-rojos.md', tres)
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }, { paso: 'ci-fix' }))
    const r = a.correr(['--hasta', 'ci-fix'])
    expect(r.estado, r.salida).toBe(0)
    expect(a.llamadas('paso')[0]).toContain('/piloto ci-fix')
    expect(a.llamadas('ruteo')).toEqual([])
  })

  it('con 2 rojos todavía se sigue con el ruteo', () => {
    a.escribirRepo('.piloto/ci-rojos.md', tres.split('\n').slice(0, 2).join('\n') + '\n')
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    expect(a.correr(['--hasta', '4.99']).estado).toBe(0)
    expect(a.llamadas('ruteo')).toHaveLength(1)
  })
})

describe('bucle.sh › lo que no se le deja al modelo', () => {
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
    expect(c).toContain('pnpm funciones')
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
