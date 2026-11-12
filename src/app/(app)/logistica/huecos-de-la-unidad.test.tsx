import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { HuecoDeLaUnidad, Unidad } from '@/modules/logistica'
import { PanelDeLaUnidad } from '@/modules/logistica/pantallas/unidad'
import type { Permisos } from '@/shared/lib/permisos'
import { HUECOS_DE_LA_UNIDAD, huecosDeLaUnidad, AVISO_SIN_REGLAS } from './huecos-de-la-unidad'

// Los huecos de las áreas traen componentes reales cuyas Server Actions importan su composición (`server-only`): en Vitest el import llega entero y cae.
vi.mock('server-only', () => ({}))

const ORIGEN = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
const OTRO = '9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f'
const unidad: Unidad = {
  tipo: 'vehiculo',
  id: '6f1b7c1e-2f0a-4e0f-9c52-1d7c1a2b3c4d',
  origenId: ORIGEN,
  titulo: 'Toyota Hilux 2019',
  faseId: null,
  faseDesde: null,
}
const concede = (clave: string, origenId: string | null): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId,
  alcance: 'todos',
})
const hueco = (clave: string, permisos: string[] = [], regla: string | null = null) =>
  ({
    clave,
    titulo: `Hueco ${clave}`,
    permisos,
    regla,
    componente: () => <p>contenido de {clave}</p>,
  }) as unknown as HuecoDeLaUnidad
const sinFlujo = { ok: true as const, data: null }
const conReglas = (...reglas: string[]) => ({ ok: true as const, data: { reglasActivas: reglas } })
const claves = (r: { huecos: readonly { clave: string }[] }) => r.huecos.map((h) => h.clave)

describe('huecos del panel de la unidad', () => {
  it('sin ningún permiso, las áreas que ya declararon huecos no ganan ni un bloque', () => {
    const r = huecosDeLaUnidad(HUECOS_DE_LA_UNIDAD, { unidad, permisos: [], flujo: sinFlujo })
    expect(r.huecos).toEqual([])
  })

  it('se dibujan en el orden del panel, sea cual sea el de la lista', () => {
    const lista = [hueco('historial'), hueco('documentos'), hueco('que-falta')]
    const r = huecosDeLaUnidad(lista, { unidad, permisos: [], flujo: sinFlujo })
    expect(claves(r)).toEqual(['que-falta', 'documentos', 'historial'])
    const html = renderToStaticMarkup(
      <PanelDeLaUnidad unidad={unidad} origen="Miami" fase={null} huecos={r.huecos} />,
    )
    const titulos = ['Hueco que-falta', 'Hueco documentos', 'Hueco historial']
    expect(titulos.map((t) => html.indexOf(t))).toEqual(
      [...titulos.map((t) => html.indexOf(t))].sort((a, b) => a - b),
    )
    expect(titulos.every((t) => html.includes(t))).toBe(true)
  })

  it('con un hueco que no es visible no dibuja ni su título', () => {
    const r = huecosDeLaUnidad([hueco('gastos', ['logistica.gastos.ver'])], {
      unidad,
      permisos: [],
      flujo: sinFlujo,
    })
    const html = renderToStaticMarkup(
      <PanelDeLaUnidad unidad={unidad} origen="Miami" fase={null} huecos={r.huecos} />,
    )
    expect(r.huecos).toEqual([])
    expect(html).not.toContain('Hueco gastos')
  })

  it('sin el permiso del hueco en el origen de la unidad no se ve (la clave de otro origen no cuenta)', () => {
    const lista = [hueco('gastos', ['logistica.gastos.ver'])]
    const ajeno = [concede('logistica.gastos.ver', OTRO)]
    const propio = [concede('logistica.gastos.ver', ORIGEN)]
    expect(claves(huecosDeLaUnidad(lista, { unidad, permisos: ajeno, flujo: sinFlujo }))).toEqual(
      [],
    )
    expect(claves(huecosDeLaUnidad(lista, { unidad, permisos: propio, flujo: sinFlujo }))).toEqual([
      'gastos',
    ])
  })

  it('con la regla apagada, ausente o sin flujo no se ve; con la regla activa, sí', () => {
    const lista = [hueco('transporte', [], 'transporte')]
    const hay = (flujo: Parameters<typeof huecosDeLaUnidad>[1]['flujo']) =>
      claves(huecosDeLaUnidad(lista, { unidad, permisos: [], flujo }))
    expect(hay(sinFlujo)).toEqual([])
    expect(hay(conReglas())).toEqual([])
    expect(hay(conReglas('aduana'))).toEqual([])
    expect(hay(conReglas('transporte'))).toEqual(['transporte'])
  })

  it('si el flujo no se pudo leer, los huecos con regla no se dibujan, los demás sí, y se avisa', () => {
    const lista = [hueco('transporte', [], 'transporte'), hueco('notas')]
    const r = huecosDeLaUnidad(lista, {
      unidad,
      permisos: [],
      flujo: { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } },
    })
    expect(claves(r)).toEqual(['notas'])
    expect(r.aviso).toBe(AVISO_SIN_REGLAS)
  })

  it('el hueco «Repuestos» del vehículo pide repuestos.ver y la regla esperas, y no se dibuja en un ítem', () => {
    const ver = [concede('repuestos.ver', null)]
    const hay = (permisos: Permisos, flujo: Parameters<typeof huecosDeLaUnidad>[1]['flujo']) =>
      claves(huecosDeLaUnidad(HUECOS_DE_LA_UNIDAD, { unidad, permisos, flujo })).includes(
        'repuestos',
      )
    expect(hay(ver, conReglas('esperas'))).toBe(true)
    expect(hay(ver, conReglas())).toBe(false)
    expect(hay([], conReglas('esperas'))).toBe(false)
    const item = { tipo: 'repuesto' as const, origenId: null }
    const enItem = huecosDeLaUnidad(HUECOS_DE_LA_UNIDAD, {
      unidad: item,
      permisos: ver,
      flujo: conReglas('esperas'),
    })
    expect(claves(enItem)).not.toContain('repuestos')
  })
})
