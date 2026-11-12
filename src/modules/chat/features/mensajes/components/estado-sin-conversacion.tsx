import { MessageSquareOffIcon } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'

// Una `?c=` válida que no es mía: salí de ella, la borraron o perdí el permiso del canal global. Nunca un 404.
export function EstadoSinConversacion() {
  return (
    <EstadoVacio
      Icono={MessageSquareOffIcon}
      titulo="Esta conversación ya no es tuya"
      descripcion="Salió de tu lista o ya no tienes acceso a ella."
      accion={
        <Link href="/chat" className={buttonVariants({ variant: 'outline' })}>
          Volver a la lista
        </Link>
      }
    />
  )
}
