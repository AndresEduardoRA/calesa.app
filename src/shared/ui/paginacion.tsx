'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { buttonVariants } from '@/shared/ui/button'

type Props = {
  // Los cursores de la página que sigue y de la anterior; null = no hay.
  siguiente: string | null
  anterior: string | null
}

// Anterior y siguiente del listado. Son enlaces a la misma URL con otro cursor: la página se
// puede recargar y compartir, y «atrás» del navegador vuelve a la que se estaba viendo.
export function Paginacion({ siguiente, anterior }: Props) {
  const ruta = usePathname()
  const parametros = useSearchParams()
  if (siguiente === null && anterior === null) {
    return null
  }
  const hacia = (cursor: string) => {
    const nuevos = new URLSearchParams(parametros)
    nuevos.set(CLAVE_DE_CURSOR, cursor)
    return `${ruta}?${nuevos.toString()}` as Route
  }
  const clases = buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })
  const apagado = `${clases} pointer-events-none opacity-50`
  return (
    <nav aria-label="Páginas" className="flex justify-end gap-2">
      {anterior === null ? (
        <span aria-disabled="true" className={apagado}>
          <ChevronLeftIcon aria-hidden />
          Anterior
        </span>
      ) : (
        <Link href={hacia(anterior)} className={clases}>
          <ChevronLeftIcon aria-hidden />
          Anterior
        </Link>
      )}
      {siguiente === null ? (
        <span aria-disabled="true" className={apagado}>
          Siguiente
          <ChevronRightIcon aria-hidden />
        </span>
      ) : (
        <Link href={hacia(siguiente)} className={clases}>
          Siguiente
          <ChevronRightIcon aria-hidden />
        </Link>
      )}
    </nav>
  )
}
