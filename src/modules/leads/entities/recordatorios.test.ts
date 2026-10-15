import { describe, expect, it } from 'vitest'
import {
  conRecordatorio,
  estadoDelRecordatorio,
  motivoDelTituloDeRecordatorio,
  ordenarRecordatorios,
  pedidoDeRecordatorio,
  recordatorioDesde,
  recordatoriosDesde,
  type Recordatorio,
} from './recordatorios'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const LEAD = '0b9c2f3e-1d4a-4c5b-8e6f-7a8b9c0d1e2f'
const AHORA = '2026-10-15T15:00:00Z'

const CRUDO = {
  id: ID,
  titulo: 'Llamar',
  recordar_en: '2026-10-16T13:00:00+00:00',
  notificado_en: null,
  completado_en: null,
  actualizado_en: '2026-10-15T14:00:00.123456+00:00',
  lead_id: LEAD,
  lead_nombre: 'Ana',
  lead_numero: 12,
}

const uno = (cambios: Partial<Recordatorio>): Recordatorio => {
  const r = recordatorioDesde(CRUDO)
  if (!r) throw new Error('el crudo debía leerse')
  const { eliminado: _e, ...base } = r
  return { ...base, ...cambios }
}

describe('recordatorioDesde', () => {
  it('lee la respuesta de la RPC y la fila de la vista; sin el lead, llega nulo', () => {
    expect(recordatorioDesde({ ...CRUDO, eliminado: true })).toMatchObject({
      id: ID,
      recordarEn: CRUDO.recordar_en,
      leadNombre: 'Ana',
      eliminado: true,
    })
    expect(
      recordatorioDesde({ ...CRUDO, lead_id: null, lead_nombre: null, lead_numero: null }),
    ).toMatchObject({
      leadId: null,
      leadNombre: null,
      eliminado: false,
    })
    expect(recordatorioDesde({ ...CRUDO, id: 'x' })).toBeNull()
    expect(recordatoriosDesde([CRUDO, { ...CRUDO, id: 'x' }])).toHaveLength(1)
  })
})

describe('estado y orden', () => {
  const vencidoViejo = uno({ id: 'a', recordarEn: '2026-10-10T10:00:00Z' })
  const vencido = uno({ id: 'b', recordarEn: '2026-10-15T14:59:00Z' })
  const proximo = uno({ id: 'c', recordarEn: '2026-10-15T16:00:00Z' })
  const lejano = uno({ id: 'd', recordarEn: '2026-12-01T10:00:00Z' })
  const completado = uno({
    id: 'e',
    recordarEn: '2026-10-01T10:00:00Z',
    completadoEn: '2026-10-02T10:00:00Z',
  })
  const completadoHoy = uno({
    id: 'f',
    recordarEn: '2026-10-01T10:00:00Z',
    completadoEn: '2026-10-15T10:00:00Z',
  })
  it('vencido es pasado y sin completar; a la misma hora ya venció', () => {
    expect(estadoDelRecordatorio(vencido, AHORA)).toBe('vencido')
    expect(estadoDelRecordatorio(uno({ recordarEn: AHORA }), AHORA)).toBe('vencido')
    expect(estadoDelRecordatorio(proximo, AHORA)).toBe('pendiente')
    expect(estadoDelRecordatorio(completado, AHORA)).toBe('completado')
  })
  it('vencidos (el más viejo arriba), pendientes (el más próximo arriba), completados (el último arriba)', () => {
    expect(
      ordenarRecordatorios(
        [completado, lejano, vencido, completadoHoy, proximo, vencidoViejo],
        AHORA,
      ).map((r) => r.id),
    ).toEqual(['a', 'b', 'c', 'd', 'f', 'e'])
  })
  it('poner reemplaza y saca el eliminado', () => {
    expect(conRecordatorio([proximo], { ...proximo, titulo: 'Otro' })[0]?.titulo).toBe('Otro')
    expect(
      conRecordatorio([proximo, lejano], { ...proximo, eliminado: true }).map((r) => r.id),
    ).toEqual(['d'])
  })
})

describe('motivoDelTituloDeRecordatorio', () => {
  it('los motivos de la base', () => {
    expect(motivoDelTituloDeRecordatorio('  ')).toBe('Escribe de qué es el recordatorio.')
    expect(motivoDelTituloDeRecordatorio('x'.repeat(121))).toBe(
      'El recordatorio admite hasta 120 caracteres.',
    )
    expect(motivoDelTituloDeRecordatorio(' Llamar ')).toBeNull()
  })
})

describe('pedidoDeRecordatorio', () => {
  const futuro = (local: string) =>
    local === ''
      ? ({ ok: false, motivo: 'Elige cuándo recordarlo.' } as const)
      : ({ ok: true, recordarEn: `${local}:00Z` } as const)
  const base = { intento: ID, leadId: LEAD, validarCuando: futuro, cuandoOriginal: '' }
  it('nuevo: con su id de intento; sin fecha o sin título, los motivos', () => {
    expect(
      pedidoDeRecordatorio({
        ...base,
        titulo: ' Llamar ',
        cuando: '2026-10-16T09:00',
        original: null,
      }),
    ).toEqual({
      tipo: 'crear',
      pedido: { id: ID, leadId: LEAD, titulo: 'Llamar', recordarEn: '2026-10-16T09:00:00Z' },
    })
    expect(pedidoDeRecordatorio({ ...base, titulo: '', cuando: '', original: null })).toEqual({
      tipo: 'invalido',
      errores: {
        titulo: 'Escribe de qué es el recordatorio.',
        recordarEn: 'Elige cuándo recordarlo.',
      },
    })
  })
  it('editar: sólo lo que cambió; el título de uno vencido no pide otra hora', () => {
    const original = uno({ recordarEn: '2026-10-01T10:00:00Z' })
    const rechazaTodo = () => ({ ok: false, motivo: 'pasado' }) as const
    expect(
      pedidoDeRecordatorio({
        ...base,
        validarCuando: rechazaTodo,
        titulo: 'Otro',
        cuando: 'x',
        cuandoOriginal: 'x',
        original,
      }),
    ).toEqual({
      tipo: 'guardar',
      pedido: {
        id: ID,
        actualizadoEnEsperado: original.actualizadoEn,
        cambios: { titulo: 'Otro' },
      },
    })
    expect(
      pedidoDeRecordatorio({
        ...base,
        titulo: 'Llamar',
        cuando: 'x',
        cuandoOriginal: 'x',
        original,
      }),
    ).toEqual({ tipo: 'sin_cambios' })
    expect(
      pedidoDeRecordatorio({
        ...base,
        titulo: 'Llamar',
        cuando: '2026-10-20T09:00',
        cuandoOriginal: 'x',
        original,
      }),
    ).toMatchObject({
      tipo: 'guardar',
      pedido: { cambios: { recordarEn: '2026-10-20T09:00:00Z' } },
    })
  })
})
