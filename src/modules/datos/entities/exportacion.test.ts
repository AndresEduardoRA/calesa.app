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
    ['vehículos (todavía no)', { entidad: 'vehiculos', delimitador: ';', origen: ORIGEN }],
    ['una fecha imposible', { entidad: 'leads', delimitador: ';', desde: '2026-02-30' }],
    ['un origen que no es guid', { entidad: 'leads', delimitador: ';', origen: 'x' }],
    ['otro separador', { entidad: 'leads', delimitador: '|' }],
    ['una clave de más', { entidad: 'leads', delimitador: ';', columnas: '*' }],
  ])('rechaza %s', (_caso, crudo) => {
    expect(esquemaDelPedido.safeParse(crudo).success).toBe(false)
  })
})

describe('filtrosDelPedido', () => {
  it('trae sólo las claves presentes', () => {
    expect(filtrosDelPedido({ entidad: 'leads', delimitador: ';' })).toEqual({})
    expect(filtrosDelPedido({ entidad: 'leads', delimitador: ',', hasta: '2026-03-01' })).toEqual({
      hasta: '2026-03-01',
    })
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
})
