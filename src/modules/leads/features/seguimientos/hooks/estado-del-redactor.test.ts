import { describe, expect, it } from 'vitest'
import {
  conErrores,
  conValor,
  esperandoRed,
  pedidoDelRedactor,
  rechazado,
  redactorLimpio,
  sinConflicto,
} from './estado-del-redactor'

const VALORES = {
  tipoId: 't',
  titulo: 'Llamó',
  detalle: null,
  visible: false,
  ocurridoEn: '',
  recordatorio: '',
}

describe('el estado del redactor', () => {
  it('escribir en un campo borra su motivo y el aviso', () => {
    const conMotivo = conErrores(redactorLimpio(VALORES), { titulo: 'x', detalle: 'y' })
    const despues = conValor({ ...conMotivo, aviso: 'z' }, 'titulo', 'Otra')
    expect(despues.valores.titulo).toBe('Otra')
    expect(despues.errores).toEqual({ detalle: 'y' })
    expect(despues.aviso).toBeNull()
    expect(conValor(conMotivo, 'visible', true).errores).toEqual({ titulo: 'x', detalle: 'y' })
  })
  it('un rechazo con campo va junto al campo; un conflicto, a su aviso; lo demás, arriba', () => {
    const base = esperandoRed(redactorLimpio(VALORES))
    const porCampo = rechazado(base, { codigo: 'validacion', mensaje: 'm' }, { detalle: 'm' })
    expect(porCampo).toMatchObject({
      pendiente: null,
      errores: { detalle: 'm' },
      aviso: null,
      conflicto: null,
    })
    const conflicto = rechazado(base, { codigo: 'conflicto', mensaje: 'Cambiaste…' })
    expect(conflicto).toMatchObject({ conflicto: 'Cambiaste…', aviso: null })
    expect(sinConflicto(conflicto).conflicto).toBeNull()
    expect(sinConflicto(conflicto).valores).toEqual(VALORES)
    expect(rechazado(base, { codigo: 'sin_permiso', mensaje: 'No' }).aviso).toBe('No')
  })
})

describe('pedidoDelRedactor', () => {
  const TIPO = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f'
  const base = {
    intento: '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11',
    leadId: '0b9c2f3e-1d4a-4c5b-8e6f-7a8b9c0d1e2f',
    ahora: '2026-10-15T15:00:00Z',
    zona: 'America/La_Paz',
    tiposActivos: [TIPO],
  }
  const original = {
    id: '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60',
    leadId: base.leadId,
    tipoId: TIPO,
    tipoNombre: 'Llamada',
    tipoIcono: null,
    titulo: 'Llamó',
    detalleDoc: null,
    detalleTexto: null,
    visibilidad: 'privado' as const,
    ocurridoEn: '2026-10-15T14:00:00Z',
    actualizadoEn: 'v1',
    eliminado: false,
    autorId: 'yo',
    autorNombre: null,
    esMio: true,
  }
  it('al anotar: el alta con su id de intento; lo inválido, con sus motivos', () => {
    expect(
      pedidoDelRedactor({ ...base, original: null, valores: { ...VALORES, tipoId: TIPO } }),
    ).toEqual({
      tipo: 'crear',
      pedido: {
        id: base.intento,
        leadId: base.leadId,
        tipoId: TIPO,
        titulo: 'Llamó',
        detalle: null,
        visibilidad: 'privado',
        ocurridoEn: null,
        recordatorio: null,
      },
    })
    expect(
      pedidoDelRedactor({ ...base, original: null, valores: { ...VALORES, titulo: '' } }),
    ).toMatchObject({ tipo: 'invalido', errores: { titulo: expect.any(String) as unknown } })
  })
  it('al editar: sólo lo que cambió, con la versión; sin cambios no se manda nada', () => {
    const valores = {
      tipoId: TIPO,
      titulo: 'Llamó',
      detalle: null,
      visible: false,
      ocurridoEn: '2026-10-15T10:00',
      recordatorio: '',
    }
    expect(pedidoDelRedactor({ ...base, original, valores })).toEqual({ tipo: 'sin_cambios' })
    expect(
      pedidoDelRedactor({ ...base, original, valores: { ...valores, visible: true } }),
    ).toEqual({
      tipo: 'guardar',
      pedido: { id: original.id, actualizadoEnEsperado: 'v1', cambios: { visibilidad: 'publico' } },
    })
  })
})
