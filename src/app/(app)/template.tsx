import type { ReactNode } from 'react'
import { TransicionPagina } from '@/shared/ui/transicion-pagina'

// Un template se vuelve a montar en cada navegación (un layout no): es lo que hace que el
// contenido que sale y el que entra se fundan con View Transitions.
export default function TemplateApp({ children }: { children: ReactNode }) {
  return <TransicionPagina>{children}</TransicionPagina>
}
