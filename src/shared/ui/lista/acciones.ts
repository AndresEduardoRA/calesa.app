import type { ReactNode } from 'react'

// Una línea del «⋯» de una fila, una tarjeta, un resumen o una ficha. Cada módulo decide cuáles y en qué orden (una lista suya, en
// `entities/`); `<MasAcciones>` sólo las dibuja, en ese orden.
export type AccionDeMenu =
  | {
      tipo: 'accion'
      clave: string
      etiqueta: string
      icono?: ReactNode
      alElegir: () => void
      // Abre algo encima (un modal, un selector): se espera a que el menú termine de cerrarse, o el foco que vuelve al
      // botón lo cierra.
      despuesDeCerrar?: boolean
      deshabilitada?: boolean
      destructiva?: boolean
    }
  | {
      tipo: 'casilla'
      clave: string
      etiqueta: string
      marcada: boolean
      alCambiar: (marcada: boolean) => void
      deshabilitada?: boolean
      // Marcar cierra el menú (lo que ofrece «Deshacer»); por defecto queda abierto.
      cierra?: boolean
    }
  | { tipo: 'separador'; clave: string }
  // Una explicación bajo una acción apagada: por qué no se puede.
  | { tipo: 'nota'; clave: string; texto: string }
