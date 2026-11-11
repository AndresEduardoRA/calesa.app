import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { enlacesDeLogistica } from './enlaces'

const concede = (clave: string, origenId: string | null = null): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId,
  alcance: 'todos',
})

describe('enlaces de la sub-navegación de logística', () => {
  it('sin logistica.ver en ningún origen no hay ninguno', () => {
    expect(enlacesDeLogistica([])).toEqual([])
    expect(enlacesDeLogistica([concede('vehiculos.ver')])).toEqual([])
  })

  it('con logistica.ver (aunque sea en un origen) está Cadena; los de las áreas, hoy, ninguno', () => {
    expect(enlacesDeLogistica([concede('logistica.ver', 'o1')])).toEqual([
      { titulo: 'Cadena', ruta: '/logistica' },
    ])
  })
})
