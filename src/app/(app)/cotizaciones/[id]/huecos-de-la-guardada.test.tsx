import type { ComponentType } from 'react'
import { describe, expect, it } from 'vitest'
import { HUECOS_DE_COMENTARIOS_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/comentarios-cotizacion'
import { HUECOS_DE_COMPROBANTES_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/comprobantes-cotizacion'
import { HUECOS_DE_FINAL_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/final-cotizacion'
import { HUECOS_DE_PAPELERA_EN_LA_GUARDADA } from '@/modules/cotizaciones/pantallas/papelera-cotizacion'
import { HUECOS_DE_LA_GUARDADA, dibujarHuecos } from './huecos-de-la-guardada'

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

  it('hoy ninguno trae componentes: no se dibuja nada, ni arriba ni abajo', () => {
    for (const h of HUECOS_DE_LA_GUARDADA) expect(h).toEqual({})
    expect(dibujarHuecos(HUECOS_DE_LA_GUARDADA, 'Acciones', props)).toBeUndefined()
    expect(dibujarHuecos(HUECOS_DE_LA_GUARDADA, 'Debajo', props)).toBeUndefined()
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

  it('un lugar que ningún hueco trae da `undefined`, aunque otro lugar sí', () => {
    expect(dibujarHuecos([{ Acciones: A }], 'Debajo', props)).toBeUndefined()
  })
})
