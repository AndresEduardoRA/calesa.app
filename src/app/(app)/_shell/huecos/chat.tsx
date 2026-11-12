import { WidgetChat } from '@/modules/chat/shell.client'
import { puede } from '@/modules/equipo/shell'
import type { Permisos } from '@/shared/lib/permisos'

type Props = {
  sesion: { usuarioId: string; permisos: Permisos }
  zona: string
}

// El hueco del widget flotante de chat: la burbuja con los no leídos, sólo para quien tiene `chat.participar`. Sin el permiso no se dibuja nada y su código
// no llega a esa persona. La base vuelve a exigirlo en cada lectura (RLS por membresía).
export function HuecoChat({ sesion, zona }: Props) {
  if (!puede(sesion.permisos, 'chat.participar')) {
    return null
  }
  return (
    <WidgetChat
      usuarioId={sesion.usuarioId}
      zona={zona}
      puedeModerar={puede(sesion.permisos, 'chat.moderar')}
    />
  )
}
