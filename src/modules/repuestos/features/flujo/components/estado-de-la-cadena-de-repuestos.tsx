'use client'

import { SearchXIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Button, buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'

// Los estados de la Cadena de repuestos que no son el tablero (8.13-3, D5). Cada uno dice qué pasa y, si hay algo que hacer aquí, lo ofrece.

// Con búsqueda, «Limpiar» la quita; sin ella (sólo `?proyecto=`) el aviso de arriba ya trae «Ver todos».
export function SinResultadosDeLaCadena({ conBusqueda }: { conBusqueda: boolean }) {
  const { limpiar } = useFiltrosDelListado()
  return (
    <EstadoVacio
      compacto
      Icono={SearchXIcon}
      titulo="Ningún repuesto coincide con los filtros."
      accion={
        conBusqueda ? (
          <Button variant="outline" onClick={limpiar}>
            Limpiar filtros
          </Button>
        ) : undefined
      }
    />
  )
}

export function CadenaSinRepuestos() {
  return <EstadoVacio compacto titulo="Todavía no hay repuestos en el flujo." />
}

export function CadenaSinFases({ enlaceAFlujos }: { enlaceAFlujos: boolean }) {
  return (
    <EstadoVacio
      compacto
      titulo="El flujo de repuestos todavía no tiene fases."
      accion={
        enlaceAFlujos ? (
          <Link
            href={`${RUTAS.configuracionDeFlujos}?ambito=repuestos` as Route}
            className={buttonVariants({ variant: 'outline' })}
          >
            Configurar el flujo
          </Link>
        ) : undefined
      }
    />
  )
}
