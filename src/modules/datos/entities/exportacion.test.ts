import { describe, expect, it } from 'vitest'
import {
  MARGEN_DEL_TOKEN_MS,
  VIDA_MINIMA_DEL_TOKEN_MS,
  esquemaDelPedido,
  filtrosDelPedido,
  necesitaRenovar,
  nombreDelArchivo,
  quedaToken,
  rangoDelPedido,
  registroDesde,
  etiquetaDeArchivo,
  TOPE_DE_FILAS,
  TOPE_POR_ENTIDAD,
  ENTIDADES_DISPONIBLES,
} from './exportacion'

const ZONA = 'America/La_Paz'
const ORIGEN = '3f0c9a43-6a2e-4c43-9b1a-0b6d1c2e8f10'

describe('esquemaDelPedido', () => {
  it('acepta leads con fechas y separador', () => {
    const pedido = esquemaDelPedido.safeParse({
      entidad: 'leads',
      delimitador: ';',
      desde: '2026-01-01',
      hasta: '2026-01-31',
    })
    expect(pedido.success).toBe(true)
  })

  it.each([
    [
      'desde > hasta',
      { entidad: 'leads', delimitador: ';', desde: '2026-02-01', hasta: '2026-01-31' },
    ],
    ['leads con origen', { entidad: 'leads', delimitador: ';', origen: ORIGEN }],
    ['vehículos sin origen', { entidad: 'vehiculos', delimitador: ';' }],
    [
      'vehículos con un origen que no es guid',
      { entidad: 'vehiculos', delimitador: ';', origen: 'x' },
    ],
    [
      'cotizaciones con un origen que no es guid',
      { entidad: 'cotizaciones', delimitador: ';', origen: 'x' },
    ],
    [
      'cotizaciones con una clave de más',
      { entidad: 'cotizaciones', delimitador: ';', lead: ORIGEN },
    ],
    ['una fecha imposible', { entidad: 'leads', delimitador: ';', desde: '2026-02-30' }],
    ['un origen que no es guid', { entidad: 'leads', delimitador: ';', origen: 'x' }],
    ['otro separador', { entidad: 'leads', delimitador: '|' }],
    ['una clave de más', { entidad: 'leads', delimitador: ';', columnas: '*' }],
  ])('rechaza %s', (_caso, crudo) => {
    expect(esquemaDelPedido.safeParse(crudo).success).toBe(false)
  })
})

describe('esquemaDelPedido: vehículos', () => {
  it('pasa con su origen', () => {
    const pedido = esquemaDelPedido.safeParse({
      entidad: 'vehiculos',
      delimitador: ';',
      origen: ORIGEN,
      hasta: '2026-01-31',
    })
    expect(pedido.success).toBe(true)
  })

  it('sin origen, lo pide de tú', () => {
    const pedido = esquemaDelPedido.safeParse({ entidad: 'vehiculos', delimitador: ';' })
    expect(pedido.error?.issues[0]?.path).toEqual(['origen'])
  })
})

describe('filtrosDelPedido', () => {
  it('en vehículos trae el origen', () => {
    expect(
      filtrosDelPedido({
        entidad: 'vehiculos',
        delimitador: ';',
        origen: ORIGEN,
        desde: '2026-01-01',
      }),
    ).toEqual({ desde: '2026-01-01', origen: ORIGEN })
  })

  it('trae sólo las claves presentes', () => {
    expect(filtrosDelPedido({ entidad: 'leads', delimitador: ';' })).toEqual({})
    expect(filtrosDelPedido({ entidad: 'leads', delimitador: ',', hasta: '2026-03-01' })).toEqual({
      hasta: '2026-03-01',
    })
  })
})

describe('T25 · cotizaciones: origen optativo', () => {
  it('pasa sin origen y con un origen guid', () => {
    expect(esquemaDelPedido.safeParse({ entidad: 'cotizaciones', delimitador: ';' }).success).toBe(
      true,
    )
    expect(
      esquemaDelPedido.safeParse({ entidad: 'cotizaciones', delimitador: ',', origen: ORIGEN })
        .success,
    ).toBe(true)
  })

  it('los filtros traen el origen sólo si vino', () => {
    expect(filtrosDelPedido({ entidad: 'cotizaciones', delimitador: ';' })).toEqual({})
    expect(
      filtrosDelPedido({
        entidad: 'cotizaciones',
        delimitador: ';',
        origen: ORIGEN,
        hasta: '2026-03-01',
      }),
    ).toEqual({ hasta: '2026-03-01', origen: ORIGEN })
  })

  it('el nombre del archivo, con y sin la etiqueta del origen', () => {
    const ahora = '2026-11-12T20:00:00Z'
    expect(nombreDelArchivo('cotizaciones', ahora, ZONA)).toBe('cotizaciones-todos-2026-11-12.csv')
    expect(nombreDelArchivo('cotizaciones', ahora, ZONA, 'subasta-usa')).toBe(
      'cotizaciones-subasta-usa-todos-2026-11-12.csv',
    )
  })

  it('las tres entidades están disponibles', () => {
    expect([...ENTIDADES_DISPONIBLES]).toEqual(['leads', 'vehiculos', 'cotizaciones'])
    expect(TOPE_POR_ENTIDAD.cotizaciones).toBe(TOPE_DE_FILAS)
  })
})

describe('registroDesde', () => {
  it('lee las dos respuestas de la base', () => {
    expect(registroDesde({ ok: true, restantes: 2 })).toEqual({ ok: true })
    expect(registroDesde({ ok: false, libre_en: '2026-11-12T21:00:00+00:00' })).toEqual({
      ok: false,
      libreEn: '2026-11-12T21:00:00+00:00',
    })
  })

  it.each([null, 'ok', { ok: true }, { ok: false }, { ok: 'true', restantes: 1 }])(
    'lo demás es nulo: %j',
    (crudo) => {
      expect(registroDesde(crudo)).toBeNull()
    },
  )
})

describe('el token', () => {
  const ahora = 1_800_000_000_000
  it('renueva si le queda menos de la vida mínima', () => {
    expect(necesitaRenovar((ahora + VIDA_MINIMA_DEL_TOKEN_MS) / 1000, ahora)).toBe(false)
    expect(necesitaRenovar((ahora + VIDA_MINIMA_DEL_TOKEN_MS - 1000) / 1000, ahora)).toBe(true)
  })

  it('no pide una página con menos del margen', () => {
    expect(quedaToken((ahora + MARGEN_DEL_TOKEN_MS) / 1000, ahora)).toBe(true)
    expect(quedaToken((ahora + MARGEN_DEL_TOKEN_MS - 1000) / 1000, ahora)).toBe(false)
  })
})

describe('rangoDelPedido', () => {
  const corte = '2026-11-12T20:00:00.000Z'

  it('un hasta en el pasado corta antes del día siguiente, sin incluir', () => {
    expect(
      rangoDelPedido(
        { entidad: 'leads', delimitador: ';', desde: '2026-01-01', hasta: '2026-01-31' },
        ZONA,
        corte,
      ),
    ).toEqual({
      desdeEn: '2026-01-01T04:00:00.000Z',
      hastaEn: '2026-02-01T04:00:00.000Z',
      hastaIncluido: false,
    })
  })

  it('sin hasta, o con el de hoy, corta en el instante de corte, incluido', () => {
    const sinHasta = { desdeEn: null, hastaEn: corte, hastaIncluido: true }
    expect(rangoDelPedido({ entidad: 'leads', delimitador: ';' }, ZONA, corte)).toEqual(sinHasta)
    expect(
      rangoDelPedido({ entidad: 'leads', delimitador: ';', hasta: '2026-11-12' }, ZONA, corte),
    ).toEqual(sinHasta)
  })
})

describe('nombreDelArchivo', () => {
  it('lleva el día en la zona de la empresa', () => {
    expect(nombreDelArchivo('leads', '2026-11-13T02:00:00.000Z', ZONA)).toBe(
      'leads-todos-2026-11-12.csv',
    )
  })

  it('con etiqueta, la lleva después de la entidad', () => {
    expect(nombreDelArchivo('leads', '2026-11-12T20:00:00.000Z', ZONA, 'subasta-usa')).toBe(
      'leads-subasta-usa-todos-2026-11-12.csv',
    )
  })
})

describe('etiquetaDeArchivo', () => {
  const ID = '3f0c9a43-6a2e-4c43-9b1a-0b6d1c2e8f10'
  it.each([
    ['Subasta USA', 'subasta-usa'],
    ['Ñandú — Importados', 'nandu-importados'],
    ['  "Oficina" / Bolivia ', 'oficina-bolivia'],
    ['¿?', '3f0c9a43'],
    ['', '3f0c9a43'],
  ])('%j da %j', (nombre, etiqueta) => {
    expect(etiquetaDeArchivo(nombre, ID)).toBe(etiqueta)
  })

  it('no pasa de 40 caracteres ni termina en guion', () => {
    const etiqueta = etiquetaDeArchivo(`${'a'.repeat(39)} bbbb`, ID)
    expect(etiqueta).toBe('a'.repeat(39))
  })
})

describe('TOPE_POR_ENTIDAD', () => {
  it('tiene cada entidad disponible y ninguna pasa el techo de la base', () => {
    expect(Object.keys(TOPE_POR_ENTIDAD).toSorted()).toEqual([...ENTIDADES_DISPONIBLES].toSorted())
    for (const tope of Object.values(TOPE_POR_ENTIDAD)) {
      expect(tope).toBeGreaterThan(0)
      expect(tope).toBeLessThanOrEqual(TOPE_DE_FILAS)
    }
  })
})
