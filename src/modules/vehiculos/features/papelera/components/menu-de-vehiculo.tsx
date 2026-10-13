'use client'

import { MoreHorizontalIcon } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import type { PermisoDePapelera } from '../../../entities/papelera'
import { useEnvioAPapelera } from '../hooks/use-envio-a-papelera'

type Props = {
  vehiculo: { id: string; titulo: string; origenId: string; actualizadoEn: string }
  permiso: PermisoDePapelera
}

// Lo demás que se puede hacer con un vehículo desde su ficha. Hoy, enviarlo a la papelera: se
// hace sin preguntar y se ofrece «Deshacer», ya desde el inventario (la ficha deja de existir).
// Sin el permiso el menú no aparece; si la base lo va a rechazar, se ve apagado con el motivo.
export function MenuDeVehiculo({ vehiculo, permiso }: Props) {
  const router = useRouter()
  const papelera = useEnvioAPapelera()
  if (permiso.estado === 'oculto') {
    return null
  }

  async function enviar() {
    if (await papelera.enviar([vehiculo])) {
      router.push(`${RUTAS.vehiculos}?origen=${vehiculo.origenId}` as Route)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Más acciones sobre ${vehiculo.titulo}`}
        disabled={papelera.enCurso}
        className="flex size-11 items-center justify-center rounded-(--radius-md) border border-(--color-line) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) disabled:opacity-50 md:size-9"
      >
        <MoreHorizontalIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem
          className="min-h-11 md:min-h-8"
          variant="destructive"
          disabled={permiso.estado === 'deshabilitado'}
          onClick={() => {
            void enviar()
          }}
        >
          Enviar a la papelera
        </DropdownMenuItem>
        {permiso.estado === 'deshabilitado' ? (
          // Un párrafo y no una etiqueta de menú: esas sólo valen dentro de un grupo.
          <p className="px-1.5 py-1.5 text-(length:--text-xs) text-(--color-ink-faint)">
            {permiso.motivo}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
