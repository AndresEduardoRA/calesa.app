import { describe, expect, it } from 'vitest'
import { camposDeLeadDesde, type CampoDeLead } from '../campo'
import { fechaHoraLocal, fechaIso, valorDeFormularioDesdeTexto } from './convertir'

function campo(tipo: string, extra: Record<string, unknown> = {}): CampoDeLead {
  return camposDeLeadDesde([
    {
      id: '00000000-0000-0000-0000-000000000001',
      clave: 'dato',
      etiqueta: 'Dato',
      tipo,
      opciones: [],
      requerido: false,
      valor_defecto: null,
      valor_defecto_empresa: null,
      grupo: null,
      orden: 10,
      en_tabla: false,
      filtrable: false,
      solo_cartera: false,
      es_sistema: false,
      activo: true,
      actualizado_en: '2026-10-14T20:00:00+00:00',
      ...extra,
    },
  ])[0] as CampoDeLead
}

const OPCIONES = [
  { clave: 'sedan', etiqueta: 'Sedán' },
  { clave: 'suv', etiqueta: 'SUV' },
]

describe('fechaIso', () => {
  it.each([
    ['2026-03-04', '2026-03-04'],
    ['4/3/2026', '2026-03-04'],
    ['04-03-2026', '2026-03-04'],
    ['4.3.2026', '2026-03-04'],
    ['29/02/2028', '2028-02-29'],
  ])('«%s» es %s', (texto, esperado) => {
    expect(fechaIso(texto)).toBe(esperado)
  })

  it.each(['31/02/2026', '2026-13-01', '29/02/2027', 'mañana', '2026/03/04', '03/04', ''])(
    '«%s» no es una fecha',
    (texto) => {
      expect(fechaIso(texto)).toBeNull()
    },
  )
})

describe('fechaHoraLocal', () => {
  it('lee las dos formas con hora', () => {
    expect(fechaHoraLocal('2026-03-04 09:30')).toBe('2026-03-04T09:30')
    expect(fechaHoraLocal('4/3/2026 9:05')).toBe('2026-03-04T09:05')
    expect(fechaHoraLocal('2026-03-04T23:59')).toBe('2026-03-04T23:59')
  })

  it('rechaza una hora que no existe', () => {
    expect(fechaHoraLocal('2026-03-04 24:00')).toBeNull()
    expect(fechaHoraLocal('2026-03-04 10:60')).toBeNull()
    expect(fechaHoraLocal('2026-03-04')).toBeNull()
  })
})

describe('valorDeFormularioDesdeTexto', () => {
  it('una celda vacía es «sin dato» de la forma del campo', () => {
    expect(valorDeFormularioDesdeTexto(campo('texto'), '  ')).toEqual({ ok: true, valor: '' })
    expect(valorDeFormularioDesdeTexto(campo('booleano'), '')).toEqual({ ok: true, valor: null })
    expect(valorDeFormularioDesdeTexto(campo('multi_opcion'), '')).toEqual({ ok: true, valor: [] })
  })

  it('sí y no, en las formas que escribe la gente', () => {
    const c = campo('booleano')
    for (const si of ['Sí', 'si', 'SI', 'Verdadero', 'true', '1', 'x']) {
      expect(valorDeFormularioDesdeTexto(c, si)).toEqual({ ok: true, valor: true })
    }
    for (const no of ['No', 'NO', 'falso', 'false', '0']) {
      expect(valorDeFormularioDesdeTexto(c, no)).toEqual({ ok: true, valor: false })
    }
    expect(valorDeFormularioDesdeTexto(c, 'quizás')).toMatchObject({ ok: false })
  })

  it('una opción por su etiqueta o su clave; una que no existe es un error que la nombra', () => {
    const c = campo('opcion', { opciones: OPCIONES })
    expect(valorDeFormularioDesdeTexto(c, 'Sedán')).toEqual({ ok: true, valor: 'sedan' })
    expect(valorDeFormularioDesdeTexto(c, 'sedan')).toEqual({ ok: true, valor: 'sedan' })
    expect(valorDeFormularioDesdeTexto(c, 'SEDAN')).toEqual({ ok: true, valor: 'sedan' })
    const mal = valorDeFormularioDesdeTexto(c, 'Camión')
    expect(mal).toMatchObject({ ok: false })
    expect(mal.ok ? '' : mal.motivo).toContain('Camión')
  })

  it('varias opciones separadas por «|»', () => {
    const c = campo('multi_opcion', { opciones: OPCIONES })
    expect(valorDeFormularioDesdeTexto(c, 'Sedán | suv')).toEqual({
      ok: true,
      valor: ['sedan', 'suv'],
    })
    expect(valorDeFormularioDesdeTexto(c, 'Sedán | Moto')).toMatchObject({ ok: false })
  })

  it('fechas', () => {
    const c = campo('fecha')
    expect(valorDeFormularioDesdeTexto(c, '4/3/2026')).toEqual({ ok: true, valor: '2026-03-04' })
    expect(valorDeFormularioDesdeTexto(c, '31/02/2026')).toMatchObject({ ok: false })
    expect(valorDeFormularioDesdeTexto(campo('fecha_hora'), '4/3/2026 9:30')).toEqual({
      ok: true,
      valor: '2026-03-04T09:30',
    })
  })

  it('números: con coma o con punto, y con miles', () => {
    const c = campo('numero')
    expect(valorDeFormularioDesdeTexto(c, '35')).toEqual({ ok: true, valor: '35' })
    expect(valorDeFormularioDesdeTexto(c, '1.234,5')).toEqual({ ok: true, valor: '1234,5' })
    expect(valorDeFormularioDesdeTexto(c, '1,234.5')).toEqual({ ok: true, valor: '1234.5' })
    expect(valorDeFormularioDesdeTexto(c, '-7')).toEqual({ ok: true, valor: '-7' })
  })

  it('quita el apóstrofo que puso la exportación, pero no uno propio', () => {
    expect(valorDeFormularioDesdeTexto(campo('texto'), "'=1+1")).toEqual({
      ok: true,
      valor: '=1+1',
    })
    expect(valorDeFormularioDesdeTexto(campo('texto'), "O'Brien")).toEqual({
      ok: true,
      valor: "O'Brien",
    })
  })

  it('un texto que parece una fórmula queda como texto: nada se interpreta', () => {
    expect(valorDeFormularioDesdeTexto(campo('texto'), '=HYPERLINK("x")')).toEqual({
      ok: true,
      valor: '=HYPERLINK("x")',
    })
  })
})
