'use client'

import type { ReactNode } from 'react'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import { useAlMenos } from '../ancho-de-pantalla'

type Props = {
  tabla: () => ReactNode
  tarjetas: () => ReactNode
}

// Una lista se dibuja en una sola vista: la tabla desde `CORTE_DE_LA_TABLA` (768 px), las tarjetas por debajo. El servidor la elige con
// el ancho de la petición (`<ProveedorDeAncho>`), así el HTML lleva una sola y la hidratación no la cambia; girar el celular o
// redimensionar la cambia en el cliente, sin pedir nada, con las mismas filas. Cada vista es una función: la otra ni se arma.
export function UnaSolaVista({ tabla, tarjetas }: Props) {
  return useAlMenos(CORTE_DE_LA_TABLA) ? tabla() : tarjetas()
}
