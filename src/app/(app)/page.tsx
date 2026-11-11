import type { Metadata } from 'next'
import { connection } from 'next/server'
import { leerAjustes } from '@/modules/empresa'
import { nombreVisible, requerirSesion, sinRol } from '@/modules/equipo'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { Bandeja } from '@/modules/tablero/pantallas/inicio'

export const metadata: Metadata = { title: 'Inicio' }

// Inicio = la bandeja de trabajo, armada con los permisos de quien entra.
export default async function PaginaInicio() {
  // La sesión y los ajustes se leen al pedir la pantalla, no al prepararla.
  await connection()
  const [sesion, ajustes] = await Promise.all([requerirSesion(), leerAjustes()])
  return (
    <Bandeja
      nombre={nombreVisible(sesion).split(' ')[0] ?? ''}
      permisos={sesion.permisos}
      sinRol={sinRol(sesion)}
      // Si no se pueden leer los ajustes: la zona por defecto (como el exportador de leads).
      zona={ajustes.ok ? ajustes.data.ajustes.zonaHoraria : ZONA_POR_DEFECTO}
    />
  )
}
