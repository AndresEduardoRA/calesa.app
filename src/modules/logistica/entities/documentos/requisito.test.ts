import { describe, expect, it } from 'vitest'
import type { DocumentoDeLaUnidad } from './documento'
import { cuentaParaElRequisito, resumenDelRequisito, type RequisitoDeDocumento } from './requisito'
import { estaVencido, textoDelVencimiento } from './vencimiento'

const HOY = '2027-01-10'

const requisito: RequisitoDeDocumento = {
  id: 'r1',
  tipoId: 't1',
  faseId: 'f1',
  faseNombre: 'En puerto',
  min: null,
  max: null,
  formatos: null,
  bloqueante: true,
}

function documento(cambios: Partial<DocumentoDeLaUnidad> = {}): DocumentoDeLaUnidad {
  return {
    id: 'd1',
    tipoId: 't1',
    estado: 'aprobado',
    ruta: 'u/abc.pdf',
    nombre: 'bl.pdf',
    mime: 'application/pdf',
    bytes: 1000,
    emitidoEl: null,
    venceEl: null,
    nota: null,
    motivoDeRechazo: null,
    subidoPor: null,
    revisadoPor: null,
    revisadoEn: null,
    visiblePortal: false,
    eliminadoEn: null,
    creadoEn: '2027-01-01T00:00:00Z',
    actualizadoEn: '2027-01-01T00:00:00Z',
    ...cambios,
  }
}

describe('cuentaParaElRequisito', () => {
  it('cuenta un documento aprobado, vivo y sin vencimiento', () => {
    expect(cuentaParaElRequisito(documento(), requisito, HOY)).toBe(true)
  })

  it('no cuenta un subido, un rechazado ni un sin subir', () => {
    for (const estado of ['subido', 'rechazado', 'pendiente'] as const) {
      expect(cuentaParaElRequisito(documento({ estado }), requisito, HOY)).toBe(false)
    }
  })

  it('no cuenta uno eliminado', () => {
    expect(
      cuentaParaElRequisito(documento({ eliminadoEn: '2027-01-05T00:00:00Z' }), requisito, HOY),
    ).toBe(false)
  })

  it('no cuenta uno vencido ayer, pero el que vence hoy aún vale', () => {
    expect(cuentaParaElRequisito(documento({ venceEl: '2027-01-09' }), requisito, HOY)).toBe(false)
    expect(cuentaParaElRequisito(documento({ venceEl: HOY }), requisito, HOY)).toBe(true)
    expect(cuentaParaElRequisito(documento({ venceEl: '2027-02-01' }), requisito, HOY)).toBe(true)
  })

  it('el formato que manda es el del requisito, no el del tipo', () => {
    const soloPdf = { ...requisito, formatos: ['application/pdf'] }
    expect(cuentaParaElRequisito(documento({ mime: 'image/png' }), soloPdf, HOY)).toBe(false)
    expect(cuentaParaElRequisito(documento({ mime: 'application/pdf' }), soloPdf, HOY)).toBe(true)
  })

  it('un mime nulo o un requisito sin formatos cuentan', () => {
    const soloPdf = { ...requisito, formatos: ['application/pdf'] }
    expect(cuentaParaElRequisito(documento({ mime: null }), soloPdf, HOY)).toBe(true)
    expect(cuentaParaElRequisito(documento({ mime: 'image/png' }), requisito, HOY)).toBe(true)
  })

  it('un documento de otro tipo no cuenta', () => {
    expect(cuentaParaElRequisito(documento({ tipoId: 't2' }), requisito, HOY)).toBe(false)
  })
})

describe('resumenDelRequisito', () => {
  it('el mínimo nulo vale 1', () => {
    expect(resumenDelRequisito([], requisito, HOY)).toEqual({
      aprobados: 0,
      minimo: 1,
      maximo: null,
      cumple: false,
    })
    expect(resumenDelRequisito([documento()], requisito, HOY).cumple).toBe(true)
  })

  it('exige el mínimo y sólo cuenta los que valen', () => {
    const dos = { ...requisito, min: 2 }
    const docs = [
      documento({ id: 'a' }),
      documento({ id: 'b', estado: 'subido' }),
      documento({ id: 'c', venceEl: '2027-01-01' }),
    ]
    const resumen = resumenDelRequisito(docs, dos, HOY)
    expect(resumen.aprobados).toBe(1)
    expect(resumen.cumple).toBe(false)
    expect(resumenDelRequisito([...docs, documento({ id: 'd' })], dos, HOY).cumple).toBe(true)
  })

  it('con máximo, de más no cumple', () => {
    const hasta1 = { ...requisito, max: 1 }
    const dos = [documento({ id: 'a' }), documento({ id: 'b' })]
    expect(resumenDelRequisito(dos, hasta1, HOY)).toMatchObject({ aprobados: 2, cumple: false })
    expect(resumenDelRequisito([documento()], hasta1, HOY).cumple).toBe(true)
  })
})

describe('vencimiento', () => {
  it('estaVencido: sólo antes de hoy', () => {
    expect(estaVencido(null, HOY)).toBe(false)
    expect(estaVencido('2027-01-09', HOY)).toBe(true)
    expect(estaVencido(HOY, HOY)).toBe(false)
  })

  it('textoDelVencimiento: nulo, «Vence el …» (con el año) y «Vencido»', () => {
    expect(textoDelVencimiento(null, HOY)).toBeNull()
    expect(textoDelVencimiento('2027-01-09', HOY)).toBe('Vencido')
    expect(textoDelVencimiento(HOY, HOY)).toBe('Vence el 10 ene 2027')
    expect(textoDelVencimiento('2027-03-03', HOY)).toBe('Vence el 3 mar 2027')
  })
})
