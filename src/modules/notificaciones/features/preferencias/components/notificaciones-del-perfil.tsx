import 'server-only'
import { Bloque } from '@/shared/ui/bloque'
import { leerApagadosDePush, leerMisSuscripciones } from '../../../composicion'
import { SeccionDeNotificacionesDiferida } from '../../push/components/diferidos'

type Props = {
  usuarioId: string
  tienePermiso: boolean
  integracionActiva: boolean
  clavePublica: string | null
}

// El bloque «Notificaciones» de `/perfil` (ancla `#notificaciones`). Lee sus dos cosas en el servidor y, si una falla, la
// sección dibuja el error con «Reintentar» sin tumbar el perfil.
export async function NotificacionesDelPerfil({
  usuarioId,
  tienePermiso,
  integracionActiva,
  clavePublica,
}: Props) {
  const [suscripciones, apagados] = await Promise.all([
    leerMisSuscripciones(usuarioId),
    leerApagadosDePush(usuarioId),
  ])
  return (
    <div id="notificaciones" className="scroll-mt-4">
      <Bloque
        titulo="Notificaciones"
        descripcion="Los avisos push llegan a tu navegador aunque tengas la app cerrada."
      >
        <SeccionDeNotificacionesDiferida
          tienePermiso={tienePermiso}
          integracionActiva={integracionActiva}
          clavePublica={clavePublica}
          suscripciones={suscripciones.ok ? suscripciones.data : null}
          apagados={apagados.ok ? apagados.data : null}
        />
      </Bloque>
    </div>
  )
}
