import type { Metadata } from 'next'
import { connection } from 'next/server'
import { leerAjustes } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { PanelDelTablero } from '@/modules/tablero/pantallas/tablero'

export const metadata: Metadata = { title: 'Tablero' }

type Props = { searchParams: Promise<{ periodo?: string | string[] }> }

// El tablero de métricas: el período viene de la URL y los widgets, de los permisos de quien entra.
export default async function PaginaTablero({ searchParams }: Props) {
  // La sesión y los ajustes se leen al pedir la pantalla, no al prepararla.
  await connection()
  const [sesion, ajustes, { periodo }] = await Promise.all([
    requerirSesion(),
    leerAjustes(),
    searchParams,
  ])
  return (
    <PanelDelTablero
      permisos={sesion.permisos}
      periodo={periodo}
      // Si no se pueden leer los ajustes: la zona por defecto (como la bandeja).
      zona={ajustes.ok ? ajustes.data.ajustes.zonaHoraria : ZONA_POR_DEFECTO}
    />
  )
}
