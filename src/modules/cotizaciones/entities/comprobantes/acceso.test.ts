import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  puedeAnularComprobantes,
  puedeEmitirComprobante,
  puedeEmitirComprobantes,
  seVenLosComprobantes,
} from './acceso'
import { numeroDeComprobante, vigenteDe, type ComprobanteDeLaCotizacion } from './comprobante'

const ORIGEN = '11111111-1111-4111-8111-111111111111'

const con = (clave: string, origenId: string | null = null): Permisos =>
  [{ clave, origenId, alcance: 'todos' as const }] as Permisos

const EMITIR = con('cotizaciones.comprobantes.emitir')

const comprobante = (numero: number, anuladoEn: string | null): ComprobanteDeLaCotizacion => ({
  id: `00000000-0000-4000-8000-00000000000${String(numero)}`,
  serie: 'A',
  numero,
  emitidoEn: '2026-11-08T10:00:00+00:00',
  emitidoPor: 'Ana',
  anuladoEn,
  anuladoPor: anuladoEn === null ? null : 'Ana',
  motivo: anuladoEn === null ? null : 'Error de tipeo',
})

const ANULADO = comprobante(1, '2026-11-08T11:00:00+00:00')
const VIGENTE = comprobante(2, null)
const final = { clase: 'final' as const, estado: 'activa' as const }

describe('puedeEmitirComprobante', () => {
  it('una final activa, con la clave y sin vigente: sí', () => {
    expect(puedeEmitirComprobante(final, EMITIR, null)).toBe(true)
  })

  it('una final con sólo anulados: sí (se emite otro)', () => {
    expect(puedeEmitirComprobante(final, EMITIR, vigenteDe([ANULADO]))).toBe(true)
  })

  it('con un vigente: no', () => {
    expect(puedeEmitirComprobante(final, EMITIR, VIGENTE)).toBe(false)
  })

  it('una preventa: no', () => {
    expect(puedeEmitirComprobante({ ...final, clase: 'preventa' }, EMITIR, null)).toBe(false)
  })

  it('una final reportada o inválida: no (sólo de una final activa)', () => {
    expect(puedeEmitirComprobante({ ...final, estado: 'reportada' }, EMITIR, null)).toBe(false)
    expect(puedeEmitirComprobante({ ...final, estado: 'invalida' }, EMITIR, null)).toBe(false)
  })

  it('sin la clave: no (gestionar finales o Empresa no alcanzan)', () => {
    expect(puedeEmitirComprobante(final, con('cotizaciones.final.gestionar', ORIGEN), null)).toBe(
      false,
    )
    expect(puedeEmitirComprobante(final, con('empresa.ajustes.gestionar'), null)).toBe(false)
    expect(puedeEmitirComprobante(final, [], null)).toBe(false)
  })
})

describe('las actions: emitir y anular piden la misma clave (P5 a)', () => {
  it('con la clave sí; sin ella no', () => {
    expect(puedeEmitirComprobantes(EMITIR)).toBe(true)
    expect(puedeAnularComprobantes(EMITIR)).toBe(true)
    expect(puedeEmitirComprobantes(con('empresa.ajustes.gestionar'))).toBe(false)
    expect(puedeAnularComprobantes(con('empresa.ajustes.gestionar'))).toBe(false)
    expect(puedeAnularComprobantes([])).toBe(false)
  })
})

describe('seVenLosComprobantes', () => {
  it('en una final, aunque no tenga ninguno', () => {
    expect(seVenLosComprobantes('final', [])).toBe(true)
  })

  it('en una preventa sólo si tiene alguno (una final que bajó con sólo anulados, P7 a)', () => {
    expect(seVenLosComprobantes('preventa', [])).toBe(false)
    expect(seVenLosComprobantes('preventa', [ANULADO])).toBe(true)
  })
})

describe('vigenteDe y numeroDeComprobante', () => {
  it('el vigente es el que no está anulado, o ninguno', () => {
    expect(vigenteDe([VIGENTE, ANULADO])).toBe(VIGENTE)
    expect(vigenteDe([ANULADO])).toBeNull()
    expect(vigenteDe([])).toBeNull()
  })

  it('«S-N», como la base', () => {
    expect(numeroDeComprobante('A', 12)).toBe('A-12')
    expect(numeroDeComprobante('E2E-CMP', 1)).toBe('E2E-CMP-1')
  })
})
