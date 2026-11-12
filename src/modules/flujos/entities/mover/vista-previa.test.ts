import { describe, expect, it } from 'vitest'
import { filasDelLoteDesde, vistaPreviaDelLoteDesde, vistaPreviaDesde } from './vista-previa'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const R = '33333333-3333-4333-8333-333333333333'

const requisito = {
  requisito_id: R,
  tipo: 'documento',
  bloqueante: true,
  descripcion: 'Documento: BL',
  cumplido: false,
  detalle: { aprobados: 0, min: 1, max: null, tipo_documento_id: A },
}
const vista = {
  ok: false,
  motivos: ['Faltan 1 requisito(s) bloqueante(s).'],
  codigos: ['requisitos'],
  fase_actual: A,
  requisitos: [requisito],
  faltan: [requisito],
  nota_obligatoria: true,
}

describe('la vista previa de mover', () => {
  it('la forma de la base pasa y se dice en camelCase', () => {
    const r = vistaPreviaDesde(vista)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.faseActual).toBe(A)
    expect(r.data.notaObligatoria).toBe(true)
    expect(r.data.faltan[0]?.requisitoId).toBe(R)
    expect(r.data.requisitos[0]?.detalle['min']).toBe(1)
  })

  it('una unidad sin fase y sin requisitos también pasa', () => {
    const r = vistaPreviaDesde({
      ...vista,
      ok: true,
      fase_actual: null,
      requisitos: [],
      faltan: [],
    })
    expect(r.ok).toBe(true)
  })

  it('una forma rota es un error inesperado, nunca una vista a medias', () => {
    for (const rota of [
      null,
      {},
      { ...vista, ok: 'si' },
      { ...vista, fase_actual: 'no-es-id' },
      { ...vista, requisitos: [{ ...requisito, tipo: 'otro' }] },
    ]) {
      const r = vistaPreviaDesde(rota)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error.codigo).toBe('inesperado')
    }
  })

  it('la vista de un lote conserva el orden de lo pedido', () => {
    const r = vistaPreviaDelLoteDesde([
      { ...vista, vehiculo_id: B },
      { ...vista, vehiculo_id: A },
    ])
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.map((v) => v.vehiculoId)).toEqual([B, A])
  })

  it('las filas del resultado de un lote conservan el orden y el motivo', () => {
    const r = filasDelLoteDesde([
      { vehiculo_id: B, ok: true, codigo: null, motivo: null, historial_id: 7 },
      {
        vehiculo_id: A,
        ok: false,
        codigo: 'requisitos',
        motivo: 'Faltan requisitos.',
        historial_id: null,
      },
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.map((f) => f.vehiculoId)).toEqual([B, A])
    expect(r.data[0]).toMatchObject({ ok: true, historialId: 7 })
    expect(r.data[1]).toMatchObject({ ok: false, codigo: 'requisitos' })
    expect(filasDelLoteDesde([{ vehiculo_id: 'x' }]).ok).toBe(false)
  })
})
