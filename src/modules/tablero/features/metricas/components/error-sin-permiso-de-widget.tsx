import { EstadoSinPermiso } from '@/shared/ui/estados'

// La base negó el permiso a un widget: no hay nada que reintentar, sólo se dice el motivo.
export function ErrorSinPermisoDeWidget({ mensaje }: { mensaje: string }) {
  return <EstadoSinPermiso titulo="Sin permiso" descripcion={mensaje} />
}
