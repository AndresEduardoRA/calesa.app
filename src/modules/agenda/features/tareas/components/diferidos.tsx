'use client'

import { diferido } from '@/shared/ui/diferido'

// La lista de «Tareas sin fecha» se pide recién al abrir la sección: el calendario no paga su código ni su lectura.
export const ListaDeTareasSinFechaDiferida = diferido(() =>
  import('./lista-de-tareas-sin-fecha').then((modulo) => modulo.ListaDeTareasSinFecha),
)
