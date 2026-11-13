import { describe, expect, it } from 'vitest'
import {
  estadoVisible,
  fraseDelAvance,
  fusionar,
  idsParaSondear,
  rechazadasDe,
  resumenesDesde,
  type ResumenDeImportacion,
} from './resumen-de-importacion'

const ID = '11111111-1111-4111-8111-111111111111'
const CREADA = '2026-11-12T10:00:00.000000+00:00'
const T0 = Date.parse(CREADA)
const MIN = 60 * 1000

function fila(cambios: Record<string, unknown> = {}) {
  return {
    id: ID,
    entidad: 'leads',
    estado: 'terminada',
    creado_en: CREADA,
    avance_en: CREADA,
    terminada_en: CREADA,
    filas_total: 3,
    procesadas: 3,
    filas_ok: 2,
    ya_existian: 1,
    rechazadas: 0,
    errores: [],
    quien: { nombre: 'Dora' },
    destino: { nombre: 'Ana' },
    origen: null,
    ...cambios,
  }
}

function resumen(cambios: Record<string, unknown> = {}): ResumenDeImportacion {
  const [r] = resumenesDesde([fila(cambios)]) ?? []
  if (!r) throw new Error('fila inválida')
  return r
}

describe('resumenesDesde', () => {
  it('aplana los embebidos y toma el primer motivo de la falla', () => {
    expect(resumen()).toMatchObject({
      creadas: 2,
      yaExistian: 1,
      quien: 'Dora',
      destino: 'Ana',
      origen: null,
    })
    expect(resumen({ destino: null, filas_ok: null }).creadas).toBe(0)
    expect(
      resumen({ estado: 'fallida', errores: [{ motivo: 'Perdió el permiso.' }] }).motivoDeFalla,
    ).toBe('Perdió el permiso.')
    expect(resumenesDesde([fila({ estado: 'rara' })])).toBeNull()
  })
})

describe('estadoVisible', () => {
  it('distingue esperando, importando, en pausa, terminada y fallida', () => {
    const pendiente = resumen({
      estado: 'pendiente',
      filas_total: null,
      avance_en: null,
      procesadas: 0,
    })
    expect(estadoVisible(pendiente, T0 + MIN)).toBe('esperando')
    // La pausa se mira primero: la que nunca empezó también está a medias.
    expect(estadoVisible(pendiente, T0 + 2 * MIN + 1000)).toBe('en_pausa')
    const procesando = resumen({ estado: 'procesando', procesadas: 1 })
    expect(estadoVisible(procesando, T0 + 2 * MIN - 1000)).toBe('importando')
    expect(estadoVisible(procesando, T0 + 2 * MIN + 1000)).toBe('en_pausa')
    expect(estadoVisible(resumen(), T0 + 99 * MIN)).toBe('terminada')
    expect(estadoVisible(resumen({ estado: 'fallida' }), T0)).toBe('fallida')
  })
})

describe('fraseDelAvance', () => {
  it('dice el resultado con singular y plural', () => {
    expect(fraseDelAvance(resumen(), T0, 'es-BO')).toBe(
      '2 creados, 1 ya existía y ninguno con errores.',
    )
    expect(
      fraseDelAvance(
        resumen({ filas_ok: 1, ya_existian: 2, rechazadas: 1, filas_total: 4 }),
        T0,
        'es-BO',
      ),
    ).toBe('1 creado, 2 ya existían y 1 con errores.')
  })

  it('dice el avance y la falla', () => {
    expect(
      fraseDelAvance(
        resumen({ estado: 'procesando', procesadas: 50, filas_total: 120 }),
        T0,
        'es-BO',
      ),
    ).toBe('Importando… 50 de 120 filas.')
    expect(
      fraseDelAvance(
        resumen({ estado: 'procesando', procesadas: 50, filas_total: 120 }),
        T0 + 3 * MIN,
        'es-BO',
      ),
    ).toBe('En pausa: sigue sola en unos minutos (50 de 120 filas).')
    const fallida = { estado: 'fallida', procesadas: 50, filas_total: 120 }
    expect(
      fraseDelAvance(
        resumen({ ...fallida, errores: [{ motivo: 'Perdió el permiso.' }] }),
        T0,
        'es-BO',
      ),
    ).toBe('No terminó: Perdió el permiso. Llegó a 50 de 120 filas.')
    expect(fraseDelAvance(resumen(fallida), T0, 'es-BO')).toBe(
      'No terminó: Se detuvo por un error. Llegó a 50 de 120 filas.',
    )
  })
})

describe('rechazadasDe', () => {
  it('sólo de una terminada o fallida con alguna, y mientras dura el informe', () => {
    expect(rechazadasDe(resumen({ estado: 'procesando' }), T0)).toBe('ninguna')
    expect(rechazadasDe(resumen({ ya_existian: 0 }), T0)).toBe('ninguna')
    expect(rechazadasDe(resumen(), T0 + MIN)).toBe('disponibles')
    expect(rechazadasDe(resumen({ estado: 'fallida', ya_existian: 0, rechazadas: 2 }), T0)).toBe(
      'disponibles',
    )
    expect(rechazadasDe(resumen(), T0 + 30 * 24 * 60 * MIN + MIN)).toBe('vencidas')
  })
})

describe('idsParaSondear y fusionar', () => {
  it('sólo las en curso, sin repetir y con tope', () => {
    const otra = '22222222-2222-4222-8222-222222222222'
    const lista = [resumen({ estado: 'procesando' }), resumen({ id: otra })]
    expect(idsParaSondear(lista, [ID])).toEqual([ID])
    const muchas = Array.from({ length: 40 }, (_, i) =>
      resumen({
        id: `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`,
        estado: 'pendiente',
      }),
    )
    expect(idsParaSondear(muchas, [otra])).toHaveLength(21)
    expect(idsParaSondear(muchas, [otra])[0]).toBe(otra)
  })

  it('reemplaza por id y deja el orden', () => {
    const otra = '22222222-2222-4222-8222-222222222222'
    const lista = [resumen({ estado: 'procesando' }), resumen({ id: otra })]
    const leida = resumen({ procesadas: 3 })
    expect(fusionar(lista, [leida]).map((r) => [r.id, r.estado])).toEqual([
      [ID, 'terminada'],
      [otra, 'terminada'],
    ])
  })
})
