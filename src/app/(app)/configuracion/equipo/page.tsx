import type { Metadata } from 'next'
import {
  ListaEquipo,
  idDePersona,
  leerEquipo,
  leerMatriz,
  leerVistaPreviaDeBaja,
  puede,
  requerirSesion,
} from '@/modules/equipo'
import { datosO } from '@/shared/lib/errores'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Equipo' }

// Las personas del equipo. Verlas pide `equipo.usuarios.ver`; invitar, cambiar roles, bloquear y
// dar de baja, `equipo.usuarios.gestionar` (y la base lo vuelve a comprobar en cada RPC).
export default async function PaginaEquipo({ searchParams }: PageProps<'/configuracion/equipo'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const puedeGestionar = puede(sesion.permisos, 'equipo.usuarios.gestionar')
  if (!puedeGestionar && !puede(sesion.permisos, 'equipo.usuarios.ver')) {
    return <EstadoSinPermiso />
  }
  // El diálogo de baja tiene su URL: cuántos leads irían al limbo se cuenta acá, antes de que el
  // botón de confirmar exista.
  const baja = puedeGestionar ? idDePersona(unParametro(parametros['baja'])) : null
  const [equipo, matriz, vistaPrevia] = await Promise.all([
    leerEquipo(),
    leerMatriz(),
    baja ? leerVistaPreviaDeBaja(baja) : null,
  ])
  return (
    <ListaEquipo
      personas={datosO(equipo)}
      roles={datosO(matriz).roles}
      misPermisos={sesion.permisos}
      yoId={sesion.usuarioId}
      puedeGestionar={puedeGestionar}
      vistaPreviaDeBaja={baja && vistaPrevia ? { personaId: baja, ...datosO(vistaPrevia) } : null}
    />
  )
}
