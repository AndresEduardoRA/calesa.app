'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CLAVE_DE_REGISTRO } from '../../../entities/filtros'

// Con `?registro=` (lo trae el «Ver actividad» de una ficha) la lista es la de un solo registro: se dice y se ofrece volver a toda la actividad,
// sin soltar los demás filtros.
export function AvisoDeUnRegistro({ entidad }: { entidad: string }) {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  parametros.delete(CLAVE_DE_REGISTRO)
  const resto = parametros.toString()
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
      <span>Mostrando la actividad de un solo registro de {entidad.toLowerCase()}.</span>
      <Link
        href={(resto === '' ? ruta : `${ruta}?${resto}`) as Route}
        className="min-h-11 content-center underline md:min-h-9"
      >
        Ver toda la actividad
      </Link>
    </p>
  )
}
