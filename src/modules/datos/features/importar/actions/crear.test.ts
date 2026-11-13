import { describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { crearConPermiso, type DependenciasDeCrear } from './crear'

const YO = '11111111-1111-4111-8111-111111111111'
const OTRA = '22222222-2222-4222-8222-222222222222'
const ID = '33333333-3333-4333-8333-333333333333'

const con = (...claves: string[]) =>
  claves.map((clave) => ({ clave, origenId: null })) as unknown as Permisos

function dependencias(pase = ok('pase-de-un-uso')) {
  return {
    crear: vi.fn<DependenciasDeCrear['crear']>(() =>
      Promise.resolve(ok({ id: ID, repetido: false })),
    ),
    pedirPase: vi.fn<DependenciasDeCrear['pedirPase']>(() => Promise.resolve(pase)),
    despertar: vi.fn<DependenciasDeCrear['despertar']>(),
  }
}

const entrada = (asignarA: string | null) => ({
  id: ID,
  entidad: 'leads' as const,
  mapeo: { Nombre: 'nombre' },
  asignarA,
  origenId: null,
})

describe('crearConPermiso', () => {
  it('sin datos.importar.todo, para otra persona: sin_permiso y la base ni se llama', async () => {
    const deps = dependencias()
    const resultado = await crearConPermiso(
      { usuarioId: YO, permisos: con('leads.crear') },
      entrada(OTRA),
      deps,
    )
    expect(resultado).toEqual(
      fallo('sin_permiso', 'No tienes permiso para importar leads para otra persona.'),
    )
    expect(deps.crear).not.toHaveBeenCalled()
  })

  it('un destino igual a mí va como null, y la ruta sale de quien llama', async () => {
    const deps = dependencias()
    const resultado = await crearConPermiso(
      { usuarioId: YO, permisos: con('leads.crear') },
      entrada(YO),
      deps,
    )
    expect(resultado).toEqual(ok({ id: ID, repetido: false }))
    expect(deps.crear).toHaveBeenCalledWith({
      id: ID,
      entidad: 'leads',
      ruta: `${YO}/${ID}.csv`,
      mapeo: { Nombre: 'nombre' },
      asignarA: null,
      origenId: null,
    })
    expect(deps.despertar).toHaveBeenCalledWith('pase-de-un-uso', ID)
  })

  it('con datos.importar.todo manda el destino', async () => {
    const deps = dependencias()
    await crearConPermiso(
      { usuarioId: YO, permisos: con('datos.importar.todo') },
      entrada(OTRA),
      deps,
    )
    expect(deps.crear.mock.calls[0]?.[0].asignarA).toBe(OTRA)
  })

  it('sin pase no despierta y la importación igual queda creada', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const deps = dependencias(fallo('inesperado', 'x'))
    const resultado = await crearConPermiso(
      { usuarioId: YO, permisos: con('leads.crear') },
      entrada(null),
      deps,
    )
    expect(resultado.ok).toBe(true)
    expect(deps.despertar).not.toHaveBeenCalled()
    expect(aviso).toHaveBeenCalledWith(`datos: la importación ${ID} espera al job`)
    aviso.mockRestore()
  })

  it('un error de la base vuelve tal cual y no pide pase', async () => {
    const deps = dependencias()
    deps.crear.mockResolvedValueOnce(fallo('regla', 'Esa persona no puede recibir leads.'))
    const resultado = await crearConPermiso(
      { usuarioId: YO, permisos: con('datos.importar.todo') },
      entrada(OTRA),
      deps,
    )
    expect(resultado).toEqual(fallo('regla', 'Esa persona no puede recibir leads.'))
    expect(deps.pedirPase).not.toHaveBeenCalled()
  })
})
