'use client'

import { createContext, type ReactNode } from 'react'
import type { PropsDeLaVistaPrevia } from './huecos'

// El hueco de la vista previa (4.18-2): el proveedor del área `tarjeta` lo llena con lo que dibuja el modal «Vista previa» (con lo que la página sabe: el asesor, el vehículo, el
// logo). Sin proveedor es nulo y el resumen no dibuja el botón ni monta nada: ni un nodo cambia. El núcleo no importa el área: recibe una función que dibuja.
export type VistaPreviaDeArea = { dibujar: (props: PropsDeLaVistaPrevia) => ReactNode }

export const ContextoDeLaVistaPrevia = createContext<VistaPreviaDeArea | null>(null)
