import type { Metadata } from 'next'
import { nombreVisible, requerirSesion, sinRol } from '@/modules/equipo'
import { Bandeja } from '@/modules/tablero'

export const metadata: Metadata = { title: 'Inicio' }

// Inicio = la bandeja de trabajo, armada con los permisos de quien entra.
export default async function PaginaInicio() {
  const sesion = await requerirSesion()
  return (
    <Bandeja
      nombre={nombreVisible(sesion).split(' ')[0] ?? ''}
      permisos={sesion.permisos}
      sinRol={sinRol(sesion)}
    />
  )
}
