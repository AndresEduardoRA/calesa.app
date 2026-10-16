import { describe, expect, it } from 'vitest'
import {
  conRecordatorio,
  estadoDelRecordatorio,
  hayCambiosEnRecordatorio,
  motivoDelTituloDeRecordatorio,
  ordenarRecordatorios,
  pedidoDeRecordatorio,
  recordatorioDesde,
  recordatorioParaEditar,
  recordatoriosDesde,
  valoresDelRecordatorio,
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

// Lo que manda agendar «Llamar» para mañana a las 9, sin vehículo.
const ALTA = {
  id: ID,
  leadId: LEAD,
  titulo: 'Llamar',
  recordarEn: '2026-10-16T09:00:00Z',
  vehiculoId: null,
}

describe('pedidoDeRecordatorio', () => {
  const futuro = (local: string) =>
    local === ''
      ? ({ ok: false, motivo: 'Elige cuándo recordarlo.' } as const)
      : ({ ok: true, recordarEn: `${local}:00Z` } as const)
  const base = {
    intento: ID,
    leadId: LEAD,
    validarCuando: futuro,
    cuandoOriginal: '',
    vehiculo: '',
  }
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
      pedido: ALTA,
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

describe('el vehículo de un recordatorio', () => {
  const AUTO = { id: '44444444-4444-4444-8444-444444444444', titulo: 'Kia Rio', numero: 13 }
  const futuro = (local: string) => ({ ok: true, recordarEn: `${local}:00Z` }) as const
  it('se lee de la vista (en columnas) y de la RPC (anidado)', () => {
    const fila = recordatorioDesde({
      id: ID,
      titulo: 'Llamar',
      recordar_en: '2026-10-16T13:00:00Z',
      notificado_en: null,
      completado_en: null,
      actualizado_en: 'v1',
      lead_id: LEAD,
      lead_nombre: 'Ana',
      lead_numero: 3,
      vehiculo_id: AUTO.id,
      vehiculo_titulo: AUTO.titulo,
      vehiculo_numero: AUTO.numero,
      vehiculo_oculto: false,
    })
    expect(fila?.vehiculo).toEqual(AUTO)
  })
  it('al agendar lo manda; al editar, sólo si cambió', () => {
    const base = { intento: ID, leadId: LEAD, validarCuando: futuro, titulo: 'Llamar' }
    expect(
      pedidoDeRecordatorio({
        ...base,
        cuando: '2026-10-16T09:00',
        cuandoOriginal: '',
        original: null,
        vehiculo: AUTO.id,
      }),
    ).toMatchObject({ tipo: 'crear', pedido: { vehiculoId: AUTO.id } })
    const original = uno({ vehiculo: AUTO })
    expect(
      pedidoDeRecordatorio({
        ...base,
        cuando: 'x',
        cuandoOriginal: 'x',
        original,
        vehiculo: AUTO.id,
      }),
    ).toEqual({ tipo: 'sin_cambios' })
    expect(
      pedidoDeRecordatorio({ ...base, cuando: 'x', cuandoOriginal: 'x', original, vehiculo: '' }),
    ).toMatchObject({ tipo: 'guardar', pedido: { cambios: { vehiculoId: null } } })
  })
})

describe('recordatorioParaEditar', () => {
  it('el propio y pendiente se edita; completado no; uno que no está, tampoco', () => {
    const pendiente = uno({})
    const hecho = uno({ id: LEAD, completadoEn: AHORA })
    expect(recordatorioParaEditar([pendiente, hecho], ID)).toEqual({
      tipo: 'editable',
      recordatorio: pendiente,
    })
    expect(recordatorioParaEditar([pendiente, hecho], LEAD).tipo).toBe('completado')
    expect(recordatorioParaEditar([pendiente], 'no-es-un-id').tipo).toBe('no_esta')
    expect(recordatorioParaEditar([], ID).tipo).toBe('no_esta')
  })
})

describe('hayCambiosEnRecordatorio', () => {
  it('nuevo: vacío no tiene cambios; un título, una fecha o un vehículo sí', () => {
    const inicial = valoresDelRecordatorio(null, '')
    expect(inicial).toEqual({ titulo: '', cuando: '', vehiculo: '' })
    expect(hayCambiosEnRecordatorio({ ...inicial, titulo: '   ' }, inicial)).toBe(false)
    expect(hayCambiosEnRecordatorio({ ...inicial, titulo: 'Llamar' }, inicial)).toBe(true)
    expect(hayCambiosEnRecordatorio({ ...inicial, cuando: '2026-10-16T09:00' }, inicial)).toBe(true)
    expect(hayCambiosEnRecordatorio({ ...inicial, vehiculo: ID }, inicial)).toBe(true)
  })

  it('editado: lo mismo que estaba no es un cambio', () => {
    const inicial = valoresDelRecordatorio(uno({}), '2026-10-16T09:00')
    expect(inicial.titulo).toBe('Llamar')
    expect(hayCambiosEnRecordatorio({ ...inicial, titulo: 'Llamar ' }, inicial)).toBe(false)
    expect(hayCambiosEnRecordatorio({ ...inicial, titulo: 'Escribir' }, inicial)).toBe(true)
    expect(hayCambiosEnRecordatorio({ ...inicial, cuando: '2026-10-17T09:00' }, inicial)).toBe(true)
  })
})
