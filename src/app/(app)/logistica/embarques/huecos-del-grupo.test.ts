import { describe, expect, it, vi } from 'vitest'
import type { HuecoDelGrupo } from '@/modules/logistica'
import type { Permisos } from '@/shared/lib/permisos'
import { HUECOS_DEL_GRUPO, huecosDelGrupo } from './huecos-del-grupo'

// Los huecos de las áreas traen componentes reales cuyas Server Actions importan su composición (`server-only`): en Vitest el import llega entero y cae.
vi.mock('server-only', () => ({}))

const concede = (clave: string, origenId: string | null): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId,
  alcance: 'todos',
})
const hueco = (clave: string, permisos: string[] = []) =>
  ({
    clave,
    titulo: `Hueco ${clave}`,
    permisos,
    regla: null,
    componente: () => null,
  }) as unknown as HuecoDelGrupo
const claves = (lista: readonly { clave: string }[]) => lista.map((h) => h.clave)

describe('huecos del resumen de un grupo', () => {
  it('sin ningún permiso no se dibuja ni uno de los de las áreas', () => {
    expect(huecosDelGrupo(HUECOS_DEL_GRUPO, [])).toEqual([])
  })

  it('van en el orden mover, documentos, gastos', () => {
    expect(claves(HUECOS_DEL_GRUPO)).toEqual(['mover', 'documentos', 'gastos'])
  })

  it('se dibuja el que tiene alguno de sus permisos, en cualquier origen', () => {
    const lista = [
      hueco('mover', ['flujos.mover']),
      hueco('documentos', ['logistica.documentos.subir']),
    ]
    expect(claves(huecosDelGrupo(lista, [concede('logistica.documentos.subir', 'o1')]))).toEqual([
      'documentos',
    ])
    expect(claves(huecosDelGrupo(lista, [concede('flujos.mover', null)]))).toEqual(['mover'])
  })

  it('el que no pide ningún permiso se dibuja siempre', () => {
    expect(claves(huecosDelGrupo([hueco('notas')], []))).toEqual(['notas'])
  })

  it('la regla de flujo no cuenta: un hueco con regla se dibuja por su permiso', () => {
    const conRegla = { ...hueco('mover', ['flujos.mover']), regla: 'transporte' }
    expect(claves(huecosDelGrupo([conRegla], [concede('flujos.mover', 'o1')]))).toEqual(['mover'])
  })
})
