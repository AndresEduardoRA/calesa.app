'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { CLAVE_DE_LEAD, CLAVE_DE_VEHICULO } from '../../../entities/ruta-de-la-hoja'

// La URL del listado sin el vehículo, el lead ni el cursor, y con lo demás (Clase, Origen…): «Ver todas».
export function useRutaDeTodas(): string {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  parametros.delete(CLAVE_DE_VEHICULO)
  parametros.delete(CLAVE_DE_LEAD)
  parametros.delete(CLAVE_DE_CURSOR)
  const consulta = parametros.toString()
  return consulta === '' ? ruta : `${ruta}?${consulta}`
}

export function EnlaceVerTodas() {
  return (
    <Link href={useRutaDeTodas() as Route} className="underline hover:text-(--color-ink)">
      Ver todas
    </Link>
  )
}

// Arriba de la lista de un vehículo o un cliente (`?vehiculo=`, `?lead=`): de quién son estas cotizaciones. El texto es uno solo (`textoDelAviso()`), antes del enlace.
export function AvisoDeLoFiltrado({ texto }: { texto: string }) {
  return (
    <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
      {texto} <EnlaceVerTodas />
    </p>
  )
}
