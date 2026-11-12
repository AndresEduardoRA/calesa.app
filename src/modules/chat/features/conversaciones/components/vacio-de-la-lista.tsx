import { MessagesSquareIcon } from 'lucide-react'
import { EstadoVacio } from '@/shared/ui/estados'

// Sin conversaciones, por primera vez. «Nueva conversación» llega con la parte 2 del paso.
export function VacioDeLaLista() {
  return (
    <EstadoVacio
      compacto
      Icono={MessagesSquareIcon}
      titulo="Aún no tienes conversaciones"
      descripcion="Las que abras con tu equipo aparecen acá."
    />
  )
}
