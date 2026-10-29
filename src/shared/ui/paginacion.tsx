'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { formatearFecha } from '@/shared/lib/fechas'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import type { UbicacionDeLaPagina } from '@/shared/lib/paginacion'
import { useState, type ReactNode } from 'react'
import { buttonVariants } from '@/shared/ui/button'
import { useRegional } from './regional'
import { useEnLinea } from './use-en-linea'

type Props = {
  // Los cursores de la página que sigue y de la anterior; null = no hay.
  siguiente: string | null
  anterior: string | null
  // Con `alIr`, cambiar de página no navega: «Anterior» y «Siguiente» son botones que le pasan el
  // cursor (una lista de un panel que se lee desde el navegador, sin pedirle la página al servidor).
  alIr?: (cursor: string) => void
}

// Anterior y siguiente del listado. Sin `alIr` son enlaces a la misma URL con otro cursor: la página
// se puede recargar y compartir, y «atrás» del navegador vuelve a la que se estaba viendo.
export function Paginacion({ siguiente, anterior, alIr }: Props) {
  const ruta = usePathname()
  const parametros = useSearchParams()
  const enLinea = useEnLinea()
  // Sin red, un enlace de página cae a una navegación completa y el navegador muestra su página vacía:
  // no se navega y se dice, y lo que se ve queda como estaba.
  const [intento, setIntento] = useState(false)
  if (siguiente === null && anterior === null) {
    return null
  }
  const hacia = (cursor: string) => {
    const nuevos = new URLSearchParams(parametros)
    nuevos.set(CLAVE_DE_CURSOR, cursor)
    return `${ruta}?${nuevos.toString()}` as Route
  }
  const lado = { enLinea, hacia, alIr, alFallar: () => setIntento(true) }
  return (
    <div className="grid justify-items-end gap-2">
      <nav aria-label="Páginas" className="flex flex-wrap justify-end gap-2">
        <Lado {...lado} cursor={anterior}>
          <ChevronLeftIcon aria-hidden />
          Anterior
        </Lado>
        <Lado {...lado} cursor={siguiente}>
          Siguiente
          <ChevronRightIcon aria-hidden />
        </Lado>
      </nav>
      {intento && !enLinea ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          Sin conexión: no se puede cambiar de página. Vuelve a intentar cuando tengas red.
        </p>
      ) : null}
    </div>
  )
}

// Un lado de la paginación: apagado si no hay cursor; si no, un enlace o, con `alIr`, un botón.
function Lado(props: {
  cursor: string | null
  enLinea: boolean
  hacia: (cursor: string) => Route
  alIr: ((cursor: string) => void) | undefined
  alFallar: () => void
  children: ReactNode
}) {
  const { cursor, enLinea, hacia, alIr, alFallar, children } = props
  const clases = buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })
  if (cursor === null) {
    return (
      <span aria-disabled="true" className={`${clases} pointer-events-none opacity-50`}>
        {children}
      </span>
    )
  }
  if (alIr) {
    const ir = () => (enLinea ? alIr(cursor) : alFallar())
    return (
      <button type="button" className={clases} onClick={ir}>
        {children}
      </button>
    )
  }
  const sinRed = (evento: { preventDefault: () => void }) => {
    if (!enLinea) {
      evento.preventDefault()
      alFallar()
    }
  }
  return (
    <Link href={hacia(cursor)} className={clases} onClick={sinRed}>
      {children}
    </Link>
  )
}

// Arriba de la lista, dónde se está (cierre 1): «Los más recientes» al principio; más adelante, «Creados hasta el 2 sep 2026»
// (la primera fila que se ve) y «Volver al principio», que quita el cursor y conserva filtros, búsqueda y tamaño. Nunca
// «página N»: con cursor no se sabe sin contar (`ubicacionDeLaPagina()`).
export function UbicacionDeLaPagina({ ubicacion }: { ubicacion: UbicacionDeLaPagina | null }) {
  const ruta = usePathname()
  const parametros = useSearchParams()
  const { zonaHoraria } = useRegional()
  if (ubicacion === null) {
    return null
  }
  if (ubicacion.tipo === 'principio') {
    return <p className="text-(length:--text-sm) text-(--color-ink-soft)">Los más recientes</p>
  }
  const sinCursor = new URLSearchParams(parametros)
  sinCursor.delete(CLAVE_DE_CURSOR)
  const texto = sinCursor.toString()
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-(length:--text-sm) text-(--color-ink-soft)">
      <span>Creados hasta el {formatearFecha(ubicacion.creadoEn, { zona: zonaHoraria })}</span>
      <Link
        href={(texto === '' ? ruta : `${ruta}?${texto}`) as Route}
        className="inline-flex min-h-11 items-center font-medium text-(--color-primario) underline-offset-4 hover:underline md:min-h-0"
      >
        Volver al principio
      </Link>
    </p>
  )
}
