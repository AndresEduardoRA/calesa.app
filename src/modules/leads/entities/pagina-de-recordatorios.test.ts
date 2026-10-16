import { describe, expect, it } from 'vitest'
import {
  cursorDeRecordatorios,
  paginaDeRecordatoriosDesde,
  ponerEnLasListas,
} from './pagina-de-recordatorios'
import type { Recordatorio } from './recordatorios'

const LEAD = '0b9c2f3e-1d4a-4c5b-8e6f-7a8b9c0d1e2f'

const fila = (id: string, completado: string | null = null) => ({
  id,
  titulo: `Llamar ${id.slice(0, 4)}`,
  recordar_en: '2026-10-20T13:00:00.123456+00:00',
  notificado_en: null,
  completado_en: completado,
  creado_en: '2026-10-10T13:00:00+00:00',
  actualizado_en: '2026-10-10T13:00:00+00:00',
  lead_id: LEAD,
  lead_nombre: 'Ana',
  lead_numero: 7,
  vehiculo_id: null,
  vehiculo_titulo: null,
  vehiculo_numero: null,
  vehiculo_oculto: false,
})

const A = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const B = '5b2f6c1f-7a1b-4f7e-8b66-2c7f3b2a1d22'

describe('paginaDeRecordatoriosDesde', () => {
  it('lee la página con sus banderas y descarta la fila que no cumple', () => {
    const pagina = paginaDeRecordatoriosDesde({
      recordatorios: [fila(A), { id: 'roto' }, fila(B)],
      hay_mas: true,
      puedo_agendar: false,
      hay_completados: true,
    })
    expect(pagina?.recordatorios.map((r) => r.id)).toEqual([A, B])
    expect(pagina).toMatchObject({ hayMas: true, puedoAgendar: false, hayCompletados: true })
    expect(pagina?.recordatorios[0]).toMatchObject({ leadNombre: 'Ana', vehiculo: null })
  })

  it('una página rota es null (no «vacía»)', () => {
    expect(paginaDeRecordatoriosDesde(null)).toBeNull()
    expect(paginaDeRecordatoriosDesde({ recordatorios: [], hay_mas: false })).toBeNull()
  })
})

describe('cursorDeRecordatorios', () => {
  const lista = (paginaDeRecordatoriosDesde({
    recordatorios: [fila(A), fila(B, '2026-10-12T09:00:00.654321+00:00')],
    hay_mas: false,
    puedo_agendar: true,
    hay_completados: true,
  })?.recordatorios ?? []) as Recordatorio[]

  it('sigue desde el último, con la fecha tal como vino (sin perder microsegundos)', () => {
    expect(cursorDeRecordatorios(lista, false)).toEqual({
      desdeEn: '2026-10-20T13:00:00.123456+00:00',
      desdeId: B,
    })
    expect(cursorDeRecordatorios(lista, true)).toEqual({
      desdeEn: '2026-10-12T09:00:00.654321+00:00',
      desdeId: B,
    })
  })

  it('sin lista, o con un último que no es de esa lista, no hay cursor', () => {
    expect(cursorDeRecordatorios([], false)).toBeNull()
    expect(cursorDeRecordatorios(lista.slice(0, 1), true)).toBeNull()
  })
})

describe('ponerEnLasListas', () => {
  const r = (n: number, completado: string | null = null): Recordatorio => ({
    ...(paginaDeRecordatoriosDesde({
      recordatorios: [fila(`00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, completado)],
      hay_mas: false,
      puedo_agendar: true,
      hay_completados: false,
    })?.recordatorios[0] as Recordatorio),
    titulo: `#${String(n)}`,
    recordarEn: new Date(Date.UTC(2026, 9, 20, 12, n)).toISOString(),
  })
  const hecho = (n: number) => r(n, new Date(Date.UTC(2026, 9, 10, 12, n)).toISOString())
  const titulos = (cargada: { lista: readonly Recordatorio[] } | null) =>
    cargada?.lista.map((x) => x.titulo)
  const base = {
    pendientes: { lista: [r(1), r(2), r(3)], hayMas: true },
    completados: null,
    hayCompletados: false,
  }

  it('uno nuevo entra en su lugar si cae dentro de lo cargado; más tarde que el último, no', () => {
    expect(titulos(ponerEnLasListas(base, r(0)).pendientes)).toEqual(['#0', '#1', '#2', '#3'])
    expect(titulos(ponerEnLasListas(base, r(9)).pendientes)).toEqual(['#1', '#2', '#3'])
    const todo = { ...base, pendientes: { ...base.pendientes, hayMas: false } }
    expect(titulos(ponerEnLasListas(todo, r(9)).pendientes)).toEqual(['#1', '#2', '#3', '#9'])
  })

  it('completar lo saca de pendientes y enciende «Completados» sin leerlos', () => {
    const listas = ponerEnLasListas(base, { ...r(2), completadoEn: '2026-10-16T10:00:00Z' })
    expect(titulos(listas.pendientes)).toEqual(['#1', '#3'])
    expect(listas.completados).toBeNull()
    expect(listas.hayCompletados).toBe(true)
  })

  it('con «Completados» abierto, el recién completado va arriba; reabrir lo devuelve a pendientes', () => {
    const abiertas = { ...base, completados: { lista: [hecho(5), hecho(4)], hayMas: false } }
    const completado = { ...r(2), titulo: '#2', completadoEn: '2026-10-16T10:00:00Z' }
    const listas = ponerEnLasListas(abiertas, completado)
    expect(titulos(listas.completados)).toEqual(['#2', '#5', '#4'])
    const reabierto = ponerEnLasListas(listas, { ...completado, completadoEn: null })
    expect(titulos(reabierto.pendientes)).toEqual(['#1', '#2', '#3'])
    expect(titulos(reabierto.completados)).toEqual(['#5', '#4'])
  })

  it('eliminar lo saca de donde esté', () => {
    const abiertas = { ...base, completados: { lista: [hecho(5)], hayMas: false } }
    expect(
      titulos(ponerEnLasListas(abiertas, { ...hecho(5), eliminado: true }).completados),
    ).toEqual([])
    expect(titulos(ponerEnLasListas(abiertas, { ...r(1), eliminado: true }).pendientes)).toEqual([
      '#2',
      '#3',
    ])
  })
})
