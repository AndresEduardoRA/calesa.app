'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { partesDelPropio } from '@/shared/lib/numeros-de-lead'
import { useRegional } from '@/shared/ui/regional'
import { coincidenciaDelNumero } from '../../../entities/numero'
import type { NumerosDeLead } from '@/shared/lib/numeros-de-lead'

// Por qué esta fila salió al buscar un número, cuando no es por el que se ve primero: «Coincide: N.º 30 · Berta» (el propio de Berta; el principal es el
// global) o «Coincide: Tu n.º 30». Sólo con el permiso del global: sin él el propio ya es el principal y no hay nada que explicar. «N.º 30» no se parte; el
// nombre de quien lo creó baja de línea donde haga falta (un nombre largo no ensancha la fila, ni la página al 200 %).
export function CoincidenciaDelNumero({
  numeros,
  buscado,
  className,
}: {
  numeros: NumerosDeLead
  buscado: number | null
  className?: string
}) {
  const { locale } = useRegional()
  const coincide = coincidenciaDelNumero(numeros, buscado)
  const partes = coincide
    ? partesDelPropio(numeros, (valor) => formatearNumero(valor, { locale, decimales: 0 }))
    : null
  if (partes === null) {
    return null
  }
  return (
    <span
      className={`min-w-0 [overflow-wrap:anywhere] ${className ?? ''}`.trim()}
      data-numero="coincidencia"
    >
      Coincide: <span className="whitespace-nowrap">{partes.numero}</span>
      {partes.creador ? ` · ${partes.creador}` : null}
    </span>
  )
}
