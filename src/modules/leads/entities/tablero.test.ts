import { describe, expect, it } from 'vitest'
import {
  busquedaDelEmbudo,
  conMovida,
  conPagina,
  cursorDeColumna,
  estadoDeLaEtapa,
  etapaElegida,
  firmaDelTablero,
  paginaDeEtapaDesde,
  tableroDesde,
  totalDelTablero,
  type Tablero,
} from './tablero'

const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`

const tarjeta = (n: number, etapa: number) => ({
  id: id(100 + n),
  etapa_id: id(etapa),
  estado: 'abierta',
  titulo: `Oportunidad ${String(n)}`,
  monto_estimado: 1000,
  moneda: 'USD',
  motivo_perdida: null,
  ultima_actividad_en: `2026-10-16T10:0${String(n)}:00+00:00`,
  actualizado_en: `2026-10-16T10:0${String(n)}:00+00:00`,
  lead: { id: id(200 + n), numero: n, nombre: `Lead ${String(n)}` },
  vehiculo: null,
})

const etapaFila = (n: number, extra: Record<string, boolean> = {}) => ({
  id: id(n),
  nombre: `Etapa ${String(n)}`,
  color: 'gris',
  es_inicial: false,
  es_ganada: false,
  es_perdida: false,
  ...extra,
})

const crudo = {
  embudo: {
    id: id(1),
    nombre: 'Ventas',
    es_default: true,
    actualizado_en: '2026-10-16T09:00:00+00:00',
  },
  columnas: [
    {
      etapa: etapaFila(10, { es_inicial: true }),
      total: 2,
      hay_mas: false,
      tarjetas: [tarjeta(1, 10), tarjeta(2, 10)],
    },
    { etapa: etapaFila(11, { es_ganada: true }), total: 0, hay_mas: false, tarjetas: [] },
    {
      etapa: etapaFila(12, { es_perdida: true }),
      total: 60,
      hay_mas: true,
      tarjetas: [tarjeta(3, 12), { roto: 1 }],
    },
  ],
}

const leido = (): Tablero => {
  const t = tableroDesde(crudo)
  if (!t) throw new Error('no leyó')
  return t
}

describe('tableroDesde', () => {
  it('lee las columnas y descarta una tarjeta rota', () => {
    const t = leido()
    expect(t.columnas.map((c) => c.tarjetas.length)).toEqual([2, 0, 1])
    expect(t.columnas[2]).toMatchObject({ total: { n: 60, hayMas: false }, hayMas: true })
    expect(totalDelTablero(t)).toBe(62)
  })
  it('null (embudo ajeno) o roto: null', () => {
    expect(tableroDesde(null)).toBeNull()
    expect(tableroDesde({ embudo: null, columnas: [] })).toBeNull()
  })
})

describe('mover', () => {
  it('a otra columna: sale, entra primera, cambia el estado y los totales', () => {
    const t = conMovida(leido(), id(102), id(11))
    expect(t.columnas[0]?.tarjetas.map((x) => x.id)).toEqual([id(101)])
    expect(t.columnas[0]?.total).toEqual({ n: 1, hayMas: false })
    expect(t.columnas[1]?.tarjetas[0]).toMatchObject({
      id: id(102),
      estado: 'ganada',
      etapaId: id(11),
    })
    expect(t.columnas[1]?.total).toEqual({ n: 1, hayMas: false })
  })
  it('a una perdida conserva el motivo que se le pase; a una abierta lo limpia', () => {
    const perdida = conMovida(leido(), id(101), id(12), { motivoPerdida: 'Precio' })
    expect(perdida.columnas[2]?.tarjetas[0]).toMatchObject({
      estado: 'perdida',
      motivoPerdida: 'Precio',
    })
    const reabierta = conMovida(perdida, id(101), id(10))
    expect(reabierta.columnas[0]?.tarjetas[0]).toMatchObject({
      estado: 'abierta',
      motivoPerdida: null,
    })
  })
  it('lo que confirma la base reemplaza lo supuesto; algo que no está no cambia nada', () => {
    const t = conMovida(leido(), id(101), id(10), { actualizadoEn: 'nueva' })
    expect(t.columnas[0]?.tarjetas.find((x) => x.id === id(101))?.actualizadoEn).toBe('nueva')
    expect(conMovida(leido(), id(999), id(10))).toEqual(leido())
  })
  it('el estado de una etapa', () => {
    expect(estadoDeLaEtapa({ esGanada: true, esPerdida: false })).toBe('ganada')
    expect(estadoDeLaEtapa({ esGanada: false, esPerdida: true })).toBe('perdida')
    expect(estadoDeLaEtapa({ esGanada: false, esPerdida: false })).toBe('abierta')
  })
})

describe('«Ver más»', () => {
  it('el cursor es la última, y la página se suma sin repetir', () => {
    const columna = leido().columnas[2]
    if (!columna) throw new Error('sin columna')
    expect(cursorDeColumna(columna)).toEqual({
      antesEn: columna.tarjetas[0]?.enEtapaDesde,
      antesId: id(103),
    })
    const pagina = paginaDeEtapaDesde({
      tarjetas: [tarjeta(3, 12), tarjeta(4, 12)],
      hay_mas: false,
    })
    if (!pagina) throw new Error('sin página')
    const t = conPagina(leido(), id(12), pagina)
    expect(t.columnas[2]?.tarjetas.map((x) => x.id)).toEqual([id(103), id(104)])
    expect(t.columnas[2]?.hayMas).toBe(false)
    expect(paginaDeEtapaDesde({})).toBeNull()
    expect(cursorDeColumna({ ...columna, tarjetas: [] })).toBeNull()
  })
})

describe('en el celular', () => {
  it('la etapa de la URL si es de este embudo; si no, la inicial', () => {
    expect(etapaElegida(leido(), id(12))).toBe(id(12))
    expect(etapaElegida(leido(), id(99))).toBe(id(10))
    expect(etapaElegida(leido(), null)).toBe(id(10))
  })
  it('la firma cambia con lo que trae el servidor', () => {
    expect(firmaDelTablero(leido())).not.toBe(firmaDelTablero(conMovida(leido(), id(101), id(11))))
  })
})

describe('busquedaDelEmbudo (cierre 1)', () => {
  it('como la aplica la base: sin espacios de los costados, hasta 60 y nada con menos de 2', () => {
    expect(busquedaDelEmbudo('  Ana  ')).toBe('Ana')
    expect(busquedaDelEmbudo('A')).toBeNull()
    expect(busquedaDelEmbudo('   ')).toBeNull()
    expect(busquedaDelEmbudo(null)).toBeNull()
    expect(busquedaDelEmbudo('x'.repeat(80))).toHaveLength(60)
  })
})
