import { describe, expect, it } from 'vitest'
import { origenesConUsoDesde } from './origen'
import { pasosDe } from './pasos'

const FILA = {
  id: '00000000-0000-0000-0000-00000000000a',
  clave: 'corea',
  nombre: 'Corea',
  sustantivo: 'vehículo',
  genero: 'm',
  tipo: 'manual',
  color: '#027a48',
  activo: true,
  apibara_plataformas: [],
  actualizado_en: '2026-10-12T20:00:00+00:00',
}

function origen(fila: Record<string, unknown>, uso: Record<string, unknown> = {}) {
  const [resultado] = origenesConUsoDesde(
    [{ ...FILA, ...fila }],
    [
      {
        origen_id: FILA.id,
        vehiculos: 0,
        cotizaciones: 0,
        campos_activos: 8,
        categorias: 0,
        fases: 0,
        formula_publicada: false,
        concesiones: 0,
        ...uso,
      },
    ],
  )
  if (!resultado) {
    throw new Error('sin origen')
  }
  return resultado
}

const pendientes = (pasos: ReturnType<typeof pasosDe>) =>
  pasos.filter((paso) => paso.pendiente).map((paso) => paso.clave)

describe('pasosDe', () => {
  it('un origen manual recién creado tiene pendientes el flujo, la fórmula y los permisos', () => {
    expect(pendientes(pasosDe(origen({}), { apibaraActiva: false }))).toEqual([
      'flujo',
      'formula',
      'permisos',
    ])
  })

  it('uno de subasta suma activar apibara', () => {
    const pasos = pasosDe(origen({ tipo: 'subasta' }), { apibaraActiva: false })
    expect(pendientes(pasos)).toContain('apibara')
  })

  it('con apibara activa ese paso ya no está pendiente', () => {
    const pasos = pasosDe(origen({ tipo: 'subasta' }), { apibaraActiva: true })
    expect(pendientes(pasos)).not.toContain('apibara')
  })

  it('un origen manual no habla de apibara', () => {
    const pasos = pasosDe(origen({}), { apibaraActiva: false })
    expect(pasos.some((paso) => paso.clave === 'apibara')).toBe(false)
  })

  it('lo que ya está hecho no queda pendiente', () => {
    const pasos = pasosDe(origen({}, { fases: 5, formula_publicada: true, concesiones: 2 }), {
      apibaraActiva: false,
    })
    expect(pendientes(pasos)).toEqual([])
  })

  it('nombra al origen en el detalle, sin texto fijo', () => {
    const [flujo] = pasosDe(origen({ nombre: 'Japón' }), { apibaraActiva: false })
    expect(flujo?.detalle).toContain('Japón')
  })
})
