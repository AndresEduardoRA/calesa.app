import type { ComponentType } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HUECOS_DE_COMENTARIOS_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/comentarios-cotizacion'
import { HUECOS_DE_COMPROBANTES_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/comprobantes-cotizacion'
import { HUECOS_DE_FINAL_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/final-cotizacion'
import { HUECOS_DE_PAPELERA_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/papelera-cotizacion'
import { HUECOS_DE_LA_GUARDADA, dibujarHuecos } from './huecos-de-la-guardada'

// Los huecos de las áreas traen componentes reales cuyas Server Actions importan su composición (`server-only`). En Next el navegador
// recibe sólo la referencia; en Vitest el import llega entero y cae. Lo que se prueba aquí es el orden y el dibujo, no el área.
vi.mock('server-only', () => ({}))

type Props = Parameters<typeof dibujarHuecos>[2]

// Los huecos de la guardada (4.15-6b, C3, C4, C6): el orden fijo (la destructiva al final) y qué da cada lugar.
const props = {
  cotizacion: { id: 'c1' },
  puedeGuardar: true,
  permisos: [],
} as unknown as Props

const A: ComponentType<Props> = () => null
const B: ComponentType<Props> = () => null
const C: ComponentType<Props> = () => null

describe('huecos de una guardada', () => {
  it('son los cuatro de las áreas, en el orden final, comprobantes, comentarios y papelera', () => {
    const orden = [
      HUECOS_DE_FINAL_EN_LA_GUARDADA,
      HUECOS_DE_COMPROBANTES_EN_LA_GUARDADA,
      HUECOS_DE_COMENTARIOS_EN_LA_GUARDADA,
      HUECOS_DE_PAPELERA_EN_LA_GUARDADA,
    ]
    expect(HUECOS_DE_LA_GUARDADA).toHaveLength(4)
    // Por identidad: cuatro objetos vacíos son iguales entre sí, y aquí importa cuál va en cada lugar.
    orden.forEach((hueco, i) => expect(HUECOS_DE_LA_GUARDADA[i]).toBe(hueco))
  })

  it('con cuatro huecos vacíos no se dibuja nada, ni arriba ni abajo', () => {
    // Huecos de prueba, no las constantes de las áreas: cada área llena el suyo en su paso (4.24, 4.25, 4.26, 4.27) sin tocar este caso.
    const vacios = [{}, {}, {}, {}]
    expect(dibujarHuecos(vacios, 'Acciones', props)).toBeUndefined()
    expect(dibujarHuecos(vacios, 'Debajo', props)).toBeUndefined()
  })

  it('con huecos de prueba da los componentes de cada lugar, en orden y con las props', () => {
    const lista = [{ Acciones: A }, { Debajo: B }, { Acciones: C }]
    const acciones = dibujarHuecos(lista, 'Acciones', props)
    const debajo = dibujarHuecos(lista, 'Debajo', props)
    const tipos = (nodo: unknown) =>
      (Array.isArray(nodo) ? nodo : []).map((e: { type: unknown }) => e.type)
    expect(tipos(acciones)).toEqual([A, C])
    expect(tipos(debajo)).toEqual([B])
    for (const e of Array.isArray(acciones) ? acciones : []) {
      expect((e as { props: unknown }).props).toEqual(props)
    }
  })

  it('`Insignias` da sólo los componentes de ese lugar, en orden (4.27-4)', () => {
    const lista = [{ Insignias: A, Acciones: B }, { Debajo: B }, { Insignias: C }]
    const insignias = dibujarHuecos(lista, 'Insignias', props)
    const tipos = (Array.isArray(insignias) ? insignias : []).map((e: { type: unknown }) => e.type)
    expect(tipos).toEqual([A, C])
    expect(dibujarHuecos([{}, {}, {}, {}], 'Insignias', props)).toBeUndefined()
  })

  it('un lugar que ningún hueco trae da `undefined`, aunque otro lugar sí', () => {
    expect(dibujarHuecos([{ Acciones: A }], 'Debajo', props)).toBeUndefined()
  })
})
