import { describe, expect, it } from 'vitest'
import type { RequisitoParaConfigurar } from '../flujo'
import { descripcionDeRequisito, notasDeRequisito, porcentajeDe } from './descripcion'
import type { OpcionesDeRequisitos } from './opciones'

function requisito(parcial: Partial<RequisitoParaConfigurar>): RequisitoParaConfigurar {
  return {
    id: 'r1',
    faseId: 'f1',
    tipo: 'dato',
    bloqueante: false,
    orden: 10,
    claveDato: null,
    config: {},
    esperaAmbito: null,
    esperaFaseId: null,
    formatos: null,
    maxArchivos: null,
    minArchivos: null,
    notas: null,
    tipoDocumentoId: null,
    ...parcial,
  }
}

const opciones: OpcionesDeRequisitos = {
  tipos: [
    { id: 't1', nombre: 'Título', formatos: ['application/pdf'], activo: true, delFlujo: false },
  ],
  truncado: false,
  fases: [{ id: 'fr', nombre: 'Recibido', flujo: 'Repuestos' }],
  fasesTruncado: false,
}

describe('descripcionDeRequisito', () => {
  it('un dato dice su etiqueta; el de pagos, su porcentaje', () => {
    expect(descripcionDeRequisito(requisito({ claveDato: 'vehiculo.vin' }), null)).toBe(
      'VIN del vehículo',
    )
    expect(
      descripcionDeRequisito(
        requisito({ claveDato: 'pagos.umbral_pct', config: { pct: 50 } }),
        null,
      ),
    ).toBe('Pagos confirmados: 50 % del precio')
  })

  it('una clave que la tabla no conoce se dice tal cual', () => {
    expect(descripcionDeRequisito(requisito({ claveDato: 'x.y' }), null)).toBe('Dato: x.y')
  })

  it('un documento dice su tipo, sus archivos y sus formatos', () => {
    const r = requisito({
      tipo: 'documento',
      tipoDocumentoId: 't1',
      minArchivos: 1,
      maxArchivos: 3,
      formatos: ['application/pdf', 'image/jpeg'],
    })
    expect(descripcionDeRequisito(r, opciones)).toBe('Título · 1 a 3 archivos · PDF, JPG')
    expect(
      descripcionDeRequisito(requisito({ tipo: 'documento', tipoDocumentoId: 't1' }), opciones),
    ).toBe('Título')
  })

  it('un documento sin nombres leídos dice «Documento»; un tipo que ya no está, que no existe', () => {
    const r = requisito({ tipo: 'documento', tipoDocumentoId: 't9' })
    expect(descripcionDeRequisito(r, null)).toBe('Documento')
    expect(descripcionDeRequisito(r, opciones)).toBe('Tipo de documento que ya no existe')
  })

  it('una espera dice quién espera, según su ámbito', () => {
    expect(
      descripcionDeRequisito(requisito({ tipo: 'espera', esperaAmbito: 'hijos' }), null),
    ).toContain('un repuesto')
    expect(
      descripcionDeRequisito(requisito({ tipo: 'espera', esperaAmbito: 'padre' }), null),
    ).toContain('el vehículo')
  })

  it('una espera nombra la fase leída; una que no figura, que ya no está activa', () => {
    const espera = requisito({ tipo: 'espera', esperaAmbito: 'hijos', esperaFaseId: 'fr' })
    expect(descripcionDeRequisito(espera, opciones)).toBe(
      'Espera a que un repuesto llegue a «Recibido»',
    )
    expect(
      descripcionDeRequisito({ ...espera, esperaAmbito: 'padre', esperaFaseId: 'fx' }, opciones),
    ).toBe('Espera a que el vehículo llegue a una fase que ya no está activa')
    // Mientras las opciones no llegaron, la forma genérica.
    expect(descripcionDeRequisito(espera, null)).toBe(
      'Espera a que un repuesto llegue a una fase del otro flujo',
    )
  })
})

describe('porcentajeDe y notasDeRequisito', () => {
  it('sólo un número en `pct` es un porcentaje', () => {
    expect(porcentajeDe({ pct: 30 })).toBe(30)
    expect(porcentajeDe({ pct: '30' })).toBeNull()
    expect(porcentajeDe(null)).toBeNull()
    expect(porcentajeDe([])).toBeNull()
  })

  it('las notas vacías no se muestran', () => {
    expect(notasDeRequisito(requisito({ notas: '  ' }))).toBeNull()
    expect(notasDeRequisito(requisito({ notas: 'Con firma' }))).toBe('Con firma')
  })
})
