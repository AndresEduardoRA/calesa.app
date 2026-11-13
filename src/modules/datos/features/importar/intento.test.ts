import { describe, expect, it } from 'vitest'
import { siguienteIntento, type DatosDelIntento } from './intento'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const ANA = '22222222-2222-4222-8222-222222222222'

const DATOS: DatosDelIntento = {
  texto: 'titulo\nHilux\n',
  entidad: 'vehiculos',
  mapeo: { Título: 'titulo', Notas: null },
  asignarA: null,
  origenId: ORIGEN,
}

function ids() {
  let n = 0
  return () => `id-${String((n += 1))}`
}

describe('siguienteIntento: no crear dos veces la misma importación', () => {
  it('sin anterior, uno nuevo', () => {
    const intento = siguienteIntento(null, DATOS, ids())
    expect(intento).toEqual({
      pedido: {
        id: 'id-1',
        entidad: 'vehiculos',
        mapeo: DATOS.mapeo,
        asignarA: null,
        origenId: ORIGEN,
      },
      texto: DATOS.texto,
    })
  })

  it('el mismo texto y el mismo pedido: el mismo intento, con el mismo id', () => {
    const anterior = siguienteIntento(null, DATOS, ids())
    const otra = siguienteIntento(anterior, { ...DATOS, mapeo: { ...DATOS.mapeo } }, ids())
    expect(otra).toBe(anterior)
  })

  it('cualquier cambio es otro intento, con otro id', () => {
    const nuevoId = ids()
    const anterior = siguienteIntento(null, DATOS, nuevoId)
    const cambios: DatosDelIntento[] = [
      { ...DATOS, texto: 'titulo\nOtra\n' },
      { ...DATOS, origenId: ANA },
      { ...DATOS, mapeo: { Título: 'titulo', Notas: 'notas' } },
      { ...DATOS, mapeo: { Notas: null, Título: 'titulo' } },
      { ...DATOS, mapeo: { Título: 'titulo' } },
      {
        texto: 'nombre\nAna\n',
        entidad: 'leads',
        mapeo: { Nombre: 'nombre' },
        asignarA: null,
        origenId: null,
      },
      {
        texto: 'nombre\nAna\n',
        entidad: 'leads',
        mapeo: { Nombre: 'nombre' },
        asignarA: ANA,
        origenId: null,
      },
    ]
    const nuevos = cambios.map((datos) => siguienteIntento(anterior, datos, nuevoId).pedido.id)
    expect(nuevos).toEqual(['id-2', 'id-3', 'id-4', 'id-5', 'id-6', 'id-7', 'id-8'])
  })
})
