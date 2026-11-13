import { describe, expect, it } from 'vitest'
import {
  TOPE_DE_INICIO,
  detalleDeEsperaDeInicio,
  detalleDeRepuestoPorMover,
  repuestosDeInicioDesde,
  rutaDelItemDeInicio,
  textoDeEsperaDeInicio,
  textoDeRepuestoPorMover,
  topeDeInicio,
  type RepuestoDeInicio,
} from './inicio'

const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const fila = {
  id: guid(1),
  descripcion: 'Pastillas',
  fase_desde: '2026-11-01T10:00:00+00:00',
  fase: { nombre: 'En tránsito', es_final: false },
  proyecto: {
    id: guid(9),
    numero: 4,
    vehiculo_id: guid(7),
    vehiculo_etiqueta: null,
    vehiculo: { titulo: 'Hilux de prueba' },
  },
}
const ahora = new Date('2026-11-03T10:00:00Z')

function leida(sobre: Partial<RepuestoDeInicio> = {}): RepuestoDeInicio {
  const r = repuestosDeInicioDesde([fila])
  if (!r.ok || r.data[0] === undefined) throw new Error('la fila válida no se leyó')
  return { ...r.data[0], ...sobre }
}

describe('las filas de Inicio de la base', () => {
  it('las arma con su fase y su proyecto', () => {
    expect(leida()).toEqual({
      id: guid(1),
      descripcion: 'Pastillas',
      faseDesde: '2026-11-01T10:00:00+00:00',
      faseNombre: 'En tránsito',
      proyecto: { id: guid(9), numero: 4, etiqueta: 'Hilux de prueba' },
    })
  })

  it('sin vehículo visible usa la etiqueta del proyecto externo', () => {
    const externo = {
      ...fila.proyecto,
      vehiculo_id: null,
      vehiculo_etiqueta: 'Camión externo',
      vehiculo: null,
    }
    const r = repuestosDeInicioDesde([{ ...fila, proyecto: externo }])
    expect(r.ok && r.data[0]?.proyecto.etiqueta).toBe('Camión externo')
  })

  it('cero filas es un resultado válido', () => {
    expect(repuestosDeInicioDesde([])).toEqual({ ok: true, data: [] })
  })

  it('un id que no es guid o un número negativo es un error visible', () => {
    for (const mala of [
      { ...fila, id: 'no-es-guid' },
      { ...fila, proyecto: { ...fila.proyecto, numero: -1 } },
      { ...fila, fase: null },
    ]) {
      const r = repuestosDeInicioDesde([fila, mala])
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.codigo).toBe('inesperado')
    }
  })
})

describe('el tope de una lectura de Inicio', () => {
  it('acepta de 1 a TOPE_DE_INICIO', () => {
    expect(topeDeInicio(1)).toEqual({ ok: true, data: 1 })
    expect(topeDeInicio(TOPE_DE_INICIO)).toEqual({ ok: true, data: TOPE_DE_INICIO })
  })

  it('rechaza 0, uno de más y un decimal con un error de validación', () => {
    for (const tope of [0, TOPE_DE_INICIO + 1, 2.5, -3, Number.NaN]) {
      const r = topeDeInicio(tope)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.codigo).toBe('validacion')
    }
  })
})

describe('los textos de las filas de Inicio', () => {
  it('«por mover»: la descripción y, de detalle, la fase, el proyecto y desde cuándo', () => {
    const f = leida()
    expect(textoDeRepuestoPorMover(f)).toBe('Pastillas')
    expect(detalleDeRepuestoPorMover(f, { zona: 'America/La_Paz', ahora })).toBe(
      'En tránsito · Proyecto #4 · en la fase anteayer',
    )
  })

  it('«por mover» sin saber desde cuándo omite lo último', () => {
    expect(
      detalleDeRepuestoPorMover(leida({ faseDesde: null }), { zona: 'America/La_Paz', ahora }),
    ).toBe('En tránsito · Proyecto #4')
  })

  it('«esperas»: el vehículo y la descripción; sin título, sólo la descripción', () => {
    expect(textoDeEsperaDeInicio(leida())).toBe('Hilux de prueba · Pastillas')
    expect(detalleDeEsperaDeInicio(leida())).toBe('En tránsito · Proyecto #4')
    const sin = leida({ proyecto: { id: guid(9), numero: 4, etiqueta: null } })
    expect(textoDeEsperaDeInicio(sin)).toBe('Pastillas')
    expect(
      textoDeEsperaDeInicio(leida({ proyecto: { id: guid(9), numero: 4, etiqueta: '  ' } })),
    ).toBe('Pastillas')
  })

  it('la ruta abre el panel del ítem sobre la hoja de su proyecto', () => {
    expect(rutaDelItemDeInicio(leida())).toBe(`/repuestos/${guid(9)}?item=${guid(1)}`)
  })
})
