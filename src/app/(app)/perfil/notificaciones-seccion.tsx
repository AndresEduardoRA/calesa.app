import { connection } from 'next/server'
import { integracionActiva } from '@/modules/empresa'
import { NotificacionesDelPerfil } from '@/modules/notificaciones/pantallas/perfil'
import { entornoPublico } from '@/shared/config/entorno'
import { puede, type Permisos } from '@/shared/lib/permisos'

// Junta lo que el bloque necesita de otros módulos (la integración `push_web` de la empresa y la clave pública del
// servidor) y se lo pasa por props: `notificaciones` no importa `empresa`. La clave se lee acá y no del bundle para que
// no dependa de que se haya incrustado al compilar.
export async function NotificacionesSeccion({
  usuarioId,
  permisos,
}: {
  usuarioId: string
  permisos: Permisos
}) {
  await connection()
  const activa = await integracionActiva('push_web')
  const clave = entornoPublico().NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null
  return (
    <NotificacionesDelPerfil
      usuarioId={usuarioId}
      tienePermiso={puede(permisos, 'notificaciones.push')}
      integracionActiva={activa}
      clavePublica={clave === '' ? null : clave}
    />
  )
}
