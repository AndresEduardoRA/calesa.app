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

  it('con logistica.ver (aunque sea en un origen) están Cadena y Aduana; con sólo ése, ningún otro enlace de las áreas', () => {
    expect(enlacesDeLogistica([concede('logistica.ver', 'o1')])).toEqual([
      { titulo: 'Cadena', ruta: '/logistica' },
      { titulo: 'Aduana', ruta: '/logistica/aduana' },
    ])
  })

  it('con logistica.gastos.ver suma «Gastos» después de Cadena; con sólo pagos.ver, no', () => {
    expect(
      enlacesDeLogistica([concede('logistica.ver', 'o1'), concede('logistica.gastos.ver', 'o1')]),
    ).toEqual([
      { titulo: 'Cadena', ruta: '/logistica' },
      { titulo: 'Aduana', ruta: '/logistica/aduana' },
      { titulo: 'Gastos', ruta: '/logistica/gastos' },
    ])
    expect(
      enlacesDeLogistica([concede('logistica.ver', 'o1'), concede('logistica.pagos.ver', 'o1')]),
    ).toEqual([
      { titulo: 'Cadena', ruta: '/logistica' },
      { titulo: 'Aduana', ruta: '/logistica/aduana' },
    ])
  })
})
