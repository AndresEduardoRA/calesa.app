import type { Metadata } from 'next'
import { leerOrigenes } from '@/modules/origenes'
import { ListaDeOrigenes } from '@/modules/origenes/pantallas/origenes'
import { puede, requerirSesion } from '@/modules/equipo'
import { datosO } from '@/shared/lib/errores'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { puedeAbrirOrigenes } from './acceso'

export const metadata: Metadata = { title: 'Orígenes' }

// Configuración › Orígenes. Los edita quien tiene `origenes.gestionar`; quien configura el flujo o
// la fórmula de uno lo ve todo deshabilitado, con el motivo (la base lo vuelve a comprobar).
export default async function PaginaOrigenes() {
  const sesion = await requerirSesion()
  if (!puedeAbrirOrigenes(sesion.permisos)) {
    return <EstadoSinPermiso />
  }
  const origenes = datosO(await leerOrigenes())
  return (
    <div className="grid max-w-3xl gap-4">
      <ListaDeOrigenes
        origenes={origenes}
        puedeGestionar={puede(sesion.permisos, 'origenes.gestionar')}
      />
    </div>
  )
}
