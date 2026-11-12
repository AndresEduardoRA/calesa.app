import type { ReactNode } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import type { Pestana } from './pestanas'

type Pedido = {
  permisos: Permisos
}

// El cuerpo de la pestaña abierta. Cada paso que llena un hueco registra aquí su cuerpo (con su `Suspense`: leer la base va tras él), p. ej.
// `ajustes: ({ permisos }) => <Suspense …><SeccionAjustes … /></Suspense>`. La página sólo abre pestañas llenas.
const SECCIONES: Partial<Record<Pestana, (pedido: Pedido) => ReactNode>> = {}

export function SeccionAbierta({ pestana, ...pedido }: Pedido & { pestana: Pestana }) {
  return SECCIONES[pestana]?.(pedido) ?? null
}
