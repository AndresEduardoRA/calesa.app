'use client'

import { SearchIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { formatearFecha } from '@/shared/lib/fechas'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { formatearNumero } from '@/shared/lib/formato'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useRegional } from '@/shared/ui/regional'
import type { RecorridoAcotado } from '../../../entities/candidatos'

// El texto de una búsqueda que se quedó en el tope (4.03, 5a-9): cuántos leads miró y hasta qué fecha de alta llegó.
export function textoDelRecorrido(
  recorrido: RecorridoAcotado,
  opciones: { locale: string; zona: string },
): string {
  const cuantos = formatearNumero(recorrido.recorridos, { locale: opciones.locale, decimales: 0 })
  return `Se buscó en ${cuantos} leads, hasta el ${formatearFecha(recorrido.hastaEn, { zona: opciones.zona })}.`
}

// «Seguir buscando»: la misma URL con el cursor que sigue desde el último lead que se miró (conserva filtros, búsqueda y tamaño).
function useHaciaElSiguienteTramo(recorrido: RecorridoAcotado): Route {
  const ruta = usePathname()
  const parametros = useSearchParams()
  const nuevos = new URLSearchParams(parametros)
  nuevos.set(CLAVE_DE_CURSOR, recorrido.seguir)
  return `${ruta}?${nuevos.toString()}` as Route
}

function SeguirBuscando({
  recorrido,
  comoBoton,
}: {
  recorrido: RecorridoAcotado
  comoBoton: boolean
}) {
  const href = useHaciaElSiguienteTramo(recorrido)
  return (
    <Link
      href={href}
      className={
        comoBoton
          ? buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })
          : 'inline-flex min-h-11 items-center font-medium text-(--color-primario) underline-offset-4 hover:underline md:min-h-0'
      }
    >
      Seguir buscando
    </Link>
  )
}

// Con filas: una línea al pie de la lista, como el aviso de toda lista que llegó a su tope.
export function AvisoDelRecorrido({ recorrido }: { recorrido: RecorridoAcotado }) {
  const { locale, zonaHoraria } = useRegional()
  return (
    <AvisoDeTope
      texto={textoDelRecorrido(recorrido, { locale, zona: zonaHoraria })}
      camino={<SeguirBuscando recorrido={recorrido} comoBoton={false} />}
    />
  )
}

// Sin filas: no es «nada coincide» (no se miró todo), es «nada hasta ahora».
export function NadaPorAhora({ recorrido }: { recorrido: RecorridoAcotado }) {
  const { locale, zonaHoraria } = useRegional()
  return (
    <EstadoVacio
      Icono={SearchIcon}
      titulo="Nada coincide hasta ahora"
      descripcion={textoDelRecorrido(recorrido, { locale, zona: zonaHoraria })}
      accion={<SeguirBuscando recorrido={recorrido} comoBoton />}
    />
  )
}
