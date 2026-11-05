import { describe, expect, it } from 'vitest'
import { FALTA_EL_VEHICULO, textoDelRechazo, type ErrorDeCrear } from './guardado'
import { resultadoDeGuardar } from './resultado-de-guardar'

const ID = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const DE_LA_BASE = 'Olga Otra cambió esta cotización hace 3 minutos.'
const rechazo = (e: ErrorDeCrear) => resultadoDeGuardar({ data: null, error: e })
const motivo = (e: ErrorDeCrear) => {
  const r = rechazo(e)
  return r.tipo === 'rechazo' ? r.motivo : r.tipo
}

describe('resultadoDeGuardar', () => {
  it('PT409 sin details (el conflicto de versión): el texto de la base y la línea propia, con «Recargar»', () => {
    const r = rechazo({ code: 'PT409', message: DE_LA_BASE })
    expect(r).toEqual({ tipo: 'rechazo', motivo: 'version_cambiada', mensaje: DE_LA_BASE })
    if (r.tipo !== 'rechazo') {
      throw new Error('Debía ser un rechazo.')
    }
    const aviso = textoDelRechazo(r.motivo, r.mensaje)
    expect(aviso.texto).toBe(
      `${DE_LA_BASE} Al recargar se abre esa versión; lo que escribiste no vuelve.`,
    )
    expect(aviso.salida).toBe('recargar')
  })

  it('un PT409 sin mensaje legible sigue siendo el conflicto, con un texto propio', () => {
    const r = rechazo({ code: 'PT409', message: '  ' })
    expect(r.tipo === 'rechazo' && r.mensaje).toBe('Esta cotización cambió.')
  })

  it('22023 intento_reusado: su texto y «Recargar»', () => {
    const e = { code: '22023', details: 'intento_reusado', hint: 'intento', message: 'x' }
    expect(motivo(e)).toBe('guardado_reusado')
    expect(textoDelRechazo('guardado_reusado')).toEqual({
      texto: 'Este guardado ya se hizo con otros datos. Recarga la cotización.',
      salida: 'recargar',
    })
  })

  it('22023 hint vehiculo sin details (la cotización cambió de vehículo o pasó a final): «cambió mientras la tenías abierta», no «este origen pide un vehículo»', () => {
    const e = { code: '22023', details: null, hint: 'vehiculo', message: 'No se quita el vehículo' }
    expect(motivo(e)).toBe('cotizacion_cambio')
    const aviso = textoDelRechazo('cotizacion_cambio')
    expect(aviso.texto).toBe('Esta cotización cambió mientras la tenías abierta: recárgala.')
    expect(aviso.texto).not.toBe(FALTA_EL_VEHICULO)
    expect(aviso.salida).toBe('recargar')
  })

  it('los demás se leen como los de crear: nodo_no_editable, otro 42501, sin código', () => {
    expect(motivo({ code: '42501', details: 'nodo_no_editable', message: 'x' })).toBe(
      'recargar_hoja',
    )
    expect(motivo({ code: '42501', message: 'x' })).toBe('sin_acceso')
    expect(motivo({ message: 'fetch failed' })).toBe('perdida')
  })

  it('un D2 no puede llegar de guardar: si llega, es «otro»', () => {
    expect(
      motivo({ code: 'PT409', details: 'desactualizada', hint: 'formula', message: 'x' }),
    ).toBe('otro')
    expect(
      motivo({ code: 'PT409', details: 'desactualizada', hint: 'tipo_cambio', message: 'x' }),
    ).toBe('otro')
  })

  it('lo guardado trae su número y su total, también con repetido: true', () => {
    for (const repetido of [false, true]) {
      const data = { cotizacion: { id: ID, numero: 41 }, totales: { usd: 10 }, repetido }
      expect(resultadoDeGuardar({ data, error: null })).toEqual({
        tipo: 'guardada',
        cotizacion: { id: ID, numero: 41, totalUsd: 10, repetido },
      })
    }
  })
})
