import { describe, expect, it } from 'vitest'
import {
  CONTEXTO,
  juegoDisenos,
  juegoFormulas,
  formulaDe,
  sembrada,
  SEMILLAS,
  tiposDeCambio,
  type Clave,
} from './semilla-lectura'
import { validarDiseno } from './validar-diseno'

// La semilla del cotizador (paso 4.08, prompt 3): `supabase/semillas/cotizador-*.sql` y los tipos de cambio de `supabase/seed.sql`.
// Acá, que cada fórmula y cada diseño sembrados sean los del juego (`casos-de-formula.json`, `casos-de-diseno.json`) y que el diseño pase el
// validador con los niveles y los tonos que la base tiene. Las cifras de las capturas y del Excel contra el motor están en `semilla-cifras.test.ts`; la misma
// prueba, contra la base, es `supabase/tests/semilla-cotizador.sql`.

describe('los tipos de cambio sembrados', () => {
  it('son los de las capturas: oficial 11,68 (el único por defecto), paralelo 12,20, unificado 12,20 y aduana 11,68', () => {
    expect(tiposDeCambio()).toEqual({
      oficial: { valor: 11.68, defecto: true },
      paralelo: { valor: 12.2, defecto: false },
      unificado: { valor: 12.2, defecto: false },
      aduana: { valor: 11.68, defecto: false },
    })
  })

  it('cada tipo de cambio que nombra una fórmula sembrada existe', () => {
    const claves = Object.keys(tiposDeCambio())
    for (const origen of Object.keys(SEMILLAS) as Clave[]) {
      for (const n of sembrada(origen).definicion.nodos) {
        if (n.tipo === 'tipo_cambio') expect(claves, `${origen}: ${n.id}`).toContain(n.clave)
      }
    }
  })
})

describe('cada fórmula sembrada es la del juego', () => {
  it.each(Object.keys(SEMILLAS) as Clave[])(
    '%s: su fórmula, sus constantes y sus tablas, tal cual',
    (clave) => {
      const s = sembrada(clave)
      const caso = juegoFormulas.find((c) => c.nombre === `semilla: ${clave}`)
      expect(caso, `falta el caso «semilla: ${clave}» en casos-de-formula.json`).toBeDefined()
      expect(s.definicion).toEqual(caso?.definicion)
      expect(s.params).toEqual(caso?.params)
    },
  )

  it.each(Object.keys(SEMILLAS) as Clave[])(
    '%s: su diseño es el del juego y valida con los niveles y los tonos de la base',
    (clave) => {
      const s = sembrada(clave)
      const caso = juegoDisenos.casos.find((c) => c.nombre.startsWith(`semilla ${clave}: `))
      expect(caso, `falta el diseño «semilla ${clave}: …» en casos-de-diseno.json`).toBeDefined()
      expect(caso?.valida).toBe(true)
      expect(s.diseno).toEqual(caso?.diseno)
      const f = formulaDe(clave)
      const v = validarDiseno(f.definicion, s.diseno, CONTEXTO)
      expect(v.ok ? 'válido' : v.error).toBe('válido')
    },
  )

  it('subasta_usa es la fórmula de las capturas salvo los tonos de los grupos y el GA (5 %, captura 02)', () => {
    const capturas = juegoDisenos.formulas['capturas']
    const s = sembrada('subasta_usa')
    const { grupos: gs, ...restoDef } = s.definicion
    const { grupos: gc, ...restoCap } = capturas?.definicion as typeof s.definicion
    expect(restoDef).toEqual(restoCap)
    expect(gs?.map((g) => g.tono)).toEqual(['verde', 'amarillo', 'naranja'])
    expect(gc?.map((g) => g.tono)).toEqual(['compra', 'logistica', 'aduana'])
    expect({ ...s.params, ga_pct: undefined }).toEqual({ ...capturas?.params, ga_pct: undefined })
    expect(s.params['ga_pct']).toBe(0.05)
    expect(capturas?.params['ga_pct']).toBe(0.1)
  })

  it('planilla_usa es el Excel entero salvo los tonos de los grupos', () => {
    const excel = juegoFormulas.find((c) => c.nombre.startsWith('excel: las cuatro cotizaciones'))
    const s = sembrada('planilla_usa')
    const { grupos: gs, ...restoDef } = s.definicion
    const { grupos: ge, ...restoExcel } = excel?.definicion as typeof s.definicion
    expect(restoDef).toEqual(restoExcel)
    expect(gs?.map((g) => g.tono)).toEqual(['verde', 'amarillo', 'naranja'])
    expect(ge?.map((g) => g.tono)).toEqual(['compra', 'logistica', 'aduana'])
    expect(s.params).toEqual(excel?.params)
  })

  it('«Avanzado» es de quien tiene el nivel «costos» en subasta_usa y planilla_usa, y en oficina no hay niveles', () => {
    for (const clave of ['subasta_usa', 'planilla_usa', 'oficina'] as const) {
      const secciones = sembrada(clave).diseno.secciones as {
        id: string
        nivel_ver?: string
        nivel_editar?: string
      }[]
      const restringidas = secciones.filter(
        (x) => x.nivel_ver !== undefined || x.nivel_editar !== undefined,
      )
      if (clave === 'oficina') {
        expect(restringidas).toEqual([])
      } else {
        expect(restringidas.map((x) => [x.id, x.nivel_ver, x.nivel_editar])).toEqual([
          ['cif', 'costos', 'costos'],
          ['impuestos', 'costos', 'costos'],
          ['poliza', 'costos', 'costos'],
        ])
      }
    }
  })

  it('subasta_usa trae los modos Unificado y Paralelo; planilla_usa y oficina, ninguno', () => {
    expect(sembrada('subasta_usa').diseno.cabecera.modos.map((m) => m.clave)).toEqual([
      'paralelo',
      'unificado',
    ])
    expect(sembrada('planilla_usa').diseno.cabecera.modos).toEqual([])
    expect(sembrada('oficina').diseno.cabecera.modos).toEqual([])
  })
})
