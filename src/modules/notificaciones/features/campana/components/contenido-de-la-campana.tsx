'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { PopoverDescription, PopoverHeader, PopoverTitle } from '@/shared/ui/popover'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { buttonVariants } from '@/shared/ui/button'
import { BellIcon } from 'lucide-react'
import { useAbrirAviso } from '../hooks/use-abrir-aviso'
import { useAvisosDeLaCampana } from '../hooks/use-avisos-de-la-campana'
import { FilaDeNotificacion, type AccionesPorTipo } from './fila-de-notificacion'

type Props = {
  // Sube con cada señal de Realtime: el popover abierto relee.
  version: number
  disponibles: readonly string[]
  acciones?: AccionesPorTipo
  alCerrar: () => void
}

function EsqueletoDeAvisos() {
  return (
    <div aria-busy="true" aria-label="Cargando las notificaciones" className="grid gap-3 p-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

// Lo que se dibuja dentro del popover: las que piden acción primero, tope 10, y «Ver todas». Su código viaja
// diferido (`diferidos.tsx`): el marco no lo paga hasta que alguien abre la campana.
export function ContenidoDeLaCampana({ version, disponibles, acciones, alCerrar }: Props) {
  const { avisos, reintentar } = useAvisosDeLaCampana(version)
  const { leidasAqui, abrir } = useAbrirAviso()

  return (
    <div className="grid min-w-0 gap-2">
      <PopoverHeader className="px-2 pt-1">
        <PopoverTitle>Notificaciones</PopoverTitle>
        <PopoverDescription className="sr-only">Tus avisos más recientes.</PopoverDescription>
      </PopoverHeader>
      {avisos.estado === 'leyendo' ? <EsqueletoDeAvisos /> : null}
      {avisos.estado === 'error' ? (
        <EstadoError compacto alReintentar={reintentar} descripcion={avisos.error.mensaje} />
      ) : null}
      {avisos.estado === 'listo' && avisos.filas.length === 0 ? (
        <EstadoVacio compacto Icono={BellIcon} titulo="No tienes notificaciones" />
      ) : null}
      {avisos.estado === 'listo' && avisos.filas.length > 0 ? (
        <ul className="grid max-h-[60dvh] min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5 overflow-y-auto">
          {avisos.filas.map((aviso) => (
            <FilaDeNotificacion
              key={aviso.id}
              aviso={aviso}
              disponibles={disponibles}
              acciones={acciones}
              leidaAqui={leidasAqui.has(aviso.id)}
              alAbrir={abrir}
              alIr={alCerrar}
            />
          ))}
        </ul>
      ) : null}
      <Link
        href={RUTAS.notificaciones as Route}
        onClick={alCerrar}
        className={buttonVariants({ variant: 'outline', className: 'h-11 w-full md:h-9' })}
      >
        Ver todas
      </Link>
    </div>
  )
}
