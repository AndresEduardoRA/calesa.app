import { describe, expect, it } from 'vitest'

import type { Permisos } from '@/shared/lib/permisos'

import { huecosVisibles, ORDEN_DE_HUECOS } from './hueco'

type H = Parameters<typeof huecosVisibles>[0][number]
const hueco = (clave: string, permisos: H['permisos'] = [], regla: string | null = null) =>
  ({ clave, titulo: clave, permisos, regla, componente: () => null }) as unknown as H
const concede = (clave: string, origenId: string | null): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId,
  alcance: 'todos',
})
const claves = (r: readonly { clave: string }[]) => r.map((h) => h.clave)
const ctx = (permisos: Permisos = [], reglasActivas: readonly string[] = []) => ({
  permisos,
  origenId: 'o1',
  reglasActivas,
})

describe('huecosVisibles', () => {
  it('los ordena por ORDEN_DE_HUECOS, no por como llegan', () => {
    const revueltos = ['historial', 'gastos', 'que-falta', 'documentos', 'notas'].map((c) =>
      hueco(c),
    )
    expect(claves(huecosVisibles(revueltos, ctx()))).toEqual(
      ORDEN_DE_HUECOS.filter((c) => revueltos.some((h) => h.clave === c)),
    )
  })

  it('una lista vacía no dibuja nada', () => {
    expect(huecosVisibles([], ctx())).toEqual([])
  })

  it('un hueco sin ninguna de sus claves en ese origen no pasa', () => {
    const h = hueco('transporte', ['logistica.transporte.editar' as H['permisos'][number]])
    expect(huecosVisibles([h], ctx([]))).toEqual([])
  })

  it('un hueco con la clave de OTRO origen tampoco pasa', () => {
    const h = hueco('transporte', ['logistica.transporte.editar' as H['permisos'][number]])
    expect(huecosVisibles([h], ctx([concede('logistica.transporte.editar', 'o2')]))).toEqual([])
  })

  it('basta una de sus claves, en ese origen o en todos', () => {
    const h = hueco('pagos', ['logistica.pagos.ver', 'logistica.pagos.confirmar'] as H['permisos'])
    expect(huecosVisibles([h], ctx([concede('logistica.pagos.confirmar', 'o1')]))).toHaveLength(1)
    expect(huecosVisibles([h], ctx([concede('logistica.pagos.ver', null)]))).toHaveLength(1)
  })

  it('un hueco sin claves se dibuja con sólo tener acceso al panel', () => {
    expect(claves(huecosVisibles([hueco('notas', [])], ctx()))).toEqual(['notas'])
  })

  it('una regla apagada o ausente no pasa; una regla nula sí', () => {
    const conRegla = hueco('transporte', [], 'transporte')
    expect(huecosVisibles([conRegla], ctx([], []))).toEqual([])
    expect(huecosVisibles([conRegla], ctx([], ['aduana']))).toEqual([])
    expect(claves(huecosVisibles([conRegla], ctx([], ['transporte'])))).toEqual(['transporte'])
    expect(claves(huecosVisibles([hueco('notas', [], null)], ctx([], [])))).toEqual(['notas'])
  })

  it('una clave desconocida no se dibuja y una repetida deja la primera', () => {
    const primero = hueco('notas')
    const segundo = { ...hueco('notas'), titulo: 'otra' }
    const r = huecosVisibles([hueco('inventada'), primero, segundo], ctx())
    expect(r).toEqual([primero])
  })
})

describe('huecosVisibles de un ítem de repuesto (8.13-2)', () => {
  const deItem = (clave: string, repuesto?: H['repuesto']) =>
    ({
      clave,
      titulo: clave,
      permisos: ['logistica.ver'],
      regla: 'transporte',
      repuesto,
      componente: () => null,
    }) as unknown as H
  const conVer = [concede('repuestos.ver', null)]
  const itemCtx = (permisos: Permisos) => ({
    permisos,
    origenId: null,
    reglasActivas: [] as readonly string[],
    tipo: 'repuesto' as const,
  })
  const propio = { permisos: ['repuestos.ver'], regla: null } as const

  it('sólo entran los huecos con variante de repuesto', () => {
    const huecos = [deItem('que-falta', propio), deItem('aduana'), deItem('notas', propio)]
    expect(claves(huecosVisibles(huecos, itemCtx(conVer)))).toEqual(['que-falta', 'notas'])
  })

  it('con repuestos.ver y sin origen se dibuja; sin él, no', () => {
    const huecos = [deItem('notas', propio)]
    expect(claves(huecosVisibles(huecos, itemCtx(conVer)))).toEqual(['notas'])
    expect(claves(huecosVisibles(huecos, itemCtx([])))).toEqual([])
  })

  it('un hueco de vehículo con la misma clave no tapa al de repuesto', () => {
    const delVehiculo = { ...deItem('notas'), repuesto: undefined }
    const delItem = deItem('notas', propio)
    expect(huecosVisibles([delVehiculo, delItem], itemCtx(conVer))).toEqual([delItem])
  })

  it('el vehículo, con el tipo por defecto o explícito, sigue igual', () => {
    const huecos = [deItem('notas', propio), deItem('que-falta')]
    const todo = [concede('logistica.ver', null)]
    const base = { permisos: todo, origenId: 'o1', reglasActivas: ['transporte'] }
    expect(claves(huecosVisibles(huecos, base))).toEqual(['que-falta', 'notas'])
    expect(claves(huecosVisibles(huecos, { ...base, tipo: 'vehiculo' }))).toEqual([
      'que-falta',
      'notas',
    ])
  })
})
