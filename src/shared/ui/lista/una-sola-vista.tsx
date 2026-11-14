'use client'

import type { ReactNode } from 'react'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import type { VistaDeLista } from '@/shared/lib/vista-de-lista'
import { useAlMenos } from '../ancho-de-pantalla'

type Props = {
  tabla: () => ReactNode
  tarjetas: () => ReactNode
  // La que eligió la persona para escritorio (`<ConmutadorDeVista>`). Sin elegir, la tabla.
  preferida?: VistaDeLista
}

// Una lista se dibuja en una sola vista: la tabla desde `CORTE_DE_LA_TABLA` (768 px), las tarjetas por debajo. El servidor la elige con
// el ancho de la petición (`<ProveedorDeAncho>`), así el HTML lleva una sola y la hidratación no la cambia; girar el celular o
// redimensionar la cambia en el cliente, sin pedir nada, con las mismas filas. Cada vista es una función: la otra ni se arma.
// Con `preferida="tarjetas"` van las tarjetas en todo ancho: por debajo del corte nunca hay tabla.
export function UnaSolaVista({ tabla, tarjetas, preferida = 'tabla' }: Props) {
  const ancha = useAlMenos(CORTE_DE_LA_TABLA)
  return ancha && preferida === 'tabla' ? tabla() : tarjetas()
}
