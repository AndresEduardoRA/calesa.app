'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { buttonVariants } from '../button'
import { EstadoVacio } from './estado-vacio'

// Se llegó con un cursor a una página que ya no tiene nada (se borró, cambió un filtro por otro
// lado): se ofrece volver al principio en vez de mostrar un vacío sin salida.
export function EstadoPaginaSinFilas() {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  parametros.delete(CLAVE_DE_CURSOR)
  return (
    <EstadoVacio
      titulo="No hay más en esta página"
      descripcion="Lo que había acá cambió mientras navegabas."
      accion={
        <Link
          href={`${ruta}?${parametros.toString()}` as Route}
          className={buttonVariants({ variant: 'outline' })}
        >
          Volver al principio
        </Link>
      }
    />
  )
}
