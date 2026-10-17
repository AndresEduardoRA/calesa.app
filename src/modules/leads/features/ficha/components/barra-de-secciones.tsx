'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import {
  CLAVE_DE_SECCION,
  hayBarraDeSecciones,
  seccionesDisponibles,
  type LoQueVe,
  type SeccionDeLead,
} from '../../../entities/ficha'

type Props = { leadId: string; actual: SeccionDeLead; ve: LoQueVe }

// Las secciones de la ficha (`?seccion=`), sin números: el de «Seguimientos» insinuaría los
// privados de otros. Cambiar de sección va al servidor (cada una lee lo suyo).
export function BarraDeSecciones({ leadId, actual, ve }: Props) {
  const lista = useRef<HTMLUListElement>(null)
  const desborde = useDesborde(lista)
  // En el celular no entran todas: la activa se ve al llegar (si no, «Portal» quedaría afuera aunque esté abierta).
  useEffect(() => {
    lista.current
      ?.querySelector('[aria-current=page]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [actual])
  if (!hayBarraDeSecciones(ve)) {
    return null
  }
  return (
    <nav aria-label="Secciones del lead" className="relative border-b border-(--color-line)">
      <ul ref={lista} className="-mb-px flex gap-1 overflow-x-auto">
        {seccionesDisponibles(ve).map((seccion) => {
          const activa = seccion.clave === actual
          const href = (
            seccion.clave === 'datos'
              ? `${RUTAS.leads}/${leadId}`
              : `${RUTAS.leads}/${leadId}?${CLAVE_DE_SECCION}=${seccion.clave}`
          ) as Route
          return (
            <li key={seccion.clave}>
              <Link
                href={href}
                aria-current={activa ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-3 text-(length:--text-sm) font-medium md:min-h-9 ${
                  activa
                    ? 'border-(--color-primario) text-(--color-ink)'
                    : 'border-transparent text-(--color-ink-soft) hover:text-(--color-ink)'
                }`}
              >
                {seccion.titulo}
              </Link>
            </li>
          )
        })}
      </ul>
      <PistaDeDesborde {...desborde} />
    </nav>
  )
}
