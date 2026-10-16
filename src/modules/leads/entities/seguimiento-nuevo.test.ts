import { describe, expect, it } from 'vitest'
import { conValoresRepuestos, valoresDeSeguimientoNuevo } from './seguimiento-nuevo'

const TIPO = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f'
const OTRO_TIPO = '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60'

describe('los valores de un seguimiento nuevo y los de un borrador', () => {
  it('arranca con el primer tipo activo, privado, sin nada escrito y «ahora»', () => {
    expect(valoresDeSeguimientoNuevo([{ id: TIPO }, { id: OTRO_TIPO }])).toEqual({
      tipoId: TIPO,
      titulo: '',
      detalle: null,
      visible: false,
      ocurridoEn: '',
      recordatorio: '',
      vehiculo: '',
    })
  })

  it('sin tipos activos no inventa uno', () => {
    expect(valoresDeSeguimientoNuevo([]).tipoId).toBe('')
  })

  it('un borrador repuesto se mezcla sobre lo que hay y su detalle pasa por la lista blanca', () => {
    const antes = valoresDeSeguimientoNuevo([{ id: TIPO }])
    const repuesto = conValoresRepuestos(antes, {
      titulo: 'Llamó',
      detalle: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] },
          { type: 'heading', content: [{ type: 'text', text: 'No va' }] },
        ],
      } as never,
    })
    expect(repuesto.titulo).toBe('Llamó')
    expect(repuesto.tipoId).toBe(TIPO)
    expect(JSON.stringify(repuesto.detalle)).toContain('Hola')
    expect(JSON.stringify(repuesto.detalle)).not.toContain('heading')
  })

  it('un tipo que ya no está activo no se repone; uno activo sí', () => {
    const antes = valoresDeSeguimientoNuevo([{ id: TIPO }])
    expect(conValoresRepuestos(antes, { tipoId: OTRO_TIPO }, [TIPO]).tipoId).toBe(TIPO)
    expect(conValoresRepuestos(antes, { tipoId: OTRO_TIPO }, [TIPO, OTRO_TIPO]).tipoId).toBe(
      OTRO_TIPO,
    )
    expect(conValoresRepuestos(antes, { tipoId: OTRO_TIPO }).tipoId).toBe(OTRO_TIPO)
  })

  it('un detalle sin texto repuesto queda en nada; sin la clave no se toca', () => {
    const antes = { ...valoresDeSeguimientoNuevo([{ id: TIPO }]), detalle: null }
    expect(
      conValoresRepuestos(antes, { detalle: { type: 'doc', content: [{ type: 'paragraph' }] } })
        .detalle,
    ).toBeNull()
    expect(conValoresRepuestos(antes, { titulo: 'x' }).detalle).toBeNull()
  })
})
