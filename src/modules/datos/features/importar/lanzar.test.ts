import { describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import { lanzarImportacion, type DependenciasDeLanzar } from './lanzar'

const YO = '11111111-1111-4111-8111-111111111111'
const ID = '33333333-3333-4333-8333-333333333333'
const RUTA = `${YO}/${ID}.csv`
const pedido = {
  id: ID,
  entidad: 'leads' as const,
  mapeo: { a: null },
  asignarA: null,
  origenId: null,
}

function dependencias() {
  const orden: string[] = []
  return {
    orden,
    subir: vi.fn<DependenciasDeLanzar['subir']>(() => {
      orden.push('subir')
      return Promise.resolve(ok(null))
    }),
    crear: vi.fn<DependenciasDeLanzar['crear']>(() => {
      orden.push('crear')
      return Promise.resolve(ok({ id: ID, repetido: false }))
    }),
    quitar: vi.fn<DependenciasDeLanzar['quitar']>(() => Promise.resolve()),
  }
}

const lanzar = (deps: ReturnType<typeof dependencias>) =>
  lanzarImportacion({ usuarioId: YO, pedido, texto: 'csv' }, deps)

describe('lanzarImportacion', () => {
  it('sube antes de crear, a la carpeta propia, y no quita nada', async () => {
    const deps = dependencias()
    expect(await lanzar(deps)).toEqual(ok({ id: ID, repetido: false }))
    expect(deps.orden).toEqual(['subir', 'crear'])
    expect(deps.subir).toHaveBeenCalledWith(RUTA, 'csv')
    expect(deps.quitar).not.toHaveBeenCalled()
  })

  it('si la subida falla, no crea', async () => {
    const deps = dependencias()
    const sinRed = fallo('inesperado', 'Sin conexión: el archivo no se subió.')
    deps.subir.mockResolvedValueOnce(sinRed)
    expect(await lanzar(deps)).toEqual(sinRed)
    expect(deps.crear).not.toHaveBeenCalled()
  })

  it('un rechazo seguro de la base quita el objeto propio', async () => {
    const deps = dependencias()
    const rechazo = fallo('sin_permiso', 'No tienes permiso.')
    deps.crear.mockResolvedValueOnce(rechazo)
    expect(await lanzar(deps)).toEqual(rechazo)
    expect(deps.quitar).toHaveBeenCalledTimes(1)
    expect(deps.quitar).toHaveBeenCalledWith(RUTA)
  })

  it('un fallo dudoso no quita: la importación pudo quedar creada', async () => {
    const deps = dependencias()
    deps.crear.mockResolvedValueOnce(fallo('inesperado', 'No pudimos llegar al servidor.'))
    await lanzar(deps)
    expect(deps.quitar).not.toHaveBeenCalled()
  })
})
