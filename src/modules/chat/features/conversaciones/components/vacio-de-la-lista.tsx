import { MessagesSquareIcon } from 'lucide-react'
import { EstadoVacio } from '@/shared/ui/estados'

// Sin conversaciones, por primera vez.
export function VacioDeLaLista() {
  return (
    <EstadoVacio
      compacto
      Icono={MessagesSquareIcon}
      titulo="Aún no tienes conversaciones"
      descripcion="Usa «Nueva conversación» para escribirle a alguien del equipo."
    />
  )
}
