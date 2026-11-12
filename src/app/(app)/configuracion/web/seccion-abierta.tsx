import type { ReactNode } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import type { Pestana } from './pestanas'
import { SeccionAjustes } from './seccion-ajustes'
import { SeccionFaqs } from './seccion-faqs'
import { SeccionTestimonios } from './seccion-testimonios'

type Pedido = {
  permisos: Permisos
}

// El cuerpo de la pestaña abierta. Cada paso que llena un hueco registra aquí su cuerpo; la página ya lo envuelve en su `Suspense` (leer la base
// va tras él) y sólo abre pestañas llenas.
const SECCIONES: Partial<Record<Pestana, (pedido: Pedido) => ReactNode>> = {
  ajustes: () => <SeccionAjustes />,
  faqs: () => <SeccionFaqs />,
  testimonios: () => <SeccionTestimonios />,
}

export function SeccionAbierta({ pestana, ...pedido }: Pedido & { pestana: Pestana }) {
  return SECCIONES[pestana]?.(pedido) ?? null
}
