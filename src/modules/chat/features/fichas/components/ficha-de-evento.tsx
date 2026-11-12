'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import type { DatosDeFichaDeEvento } from '../../../entities/fichas'

const ESTADO = { pendiente: 'Pendiente', completado: 'Realizado', cancelado: 'Cancelado' } as const

// El evento creado desde el chat: cuándo es, dónde y su estado, con el enlace a la agenda.
export function FichaDeEvento({ id, datos }: { id: string; datos: DatosDeFichaDeEvento }) {
  const { zonaHoraria } = useRegional()
  return (
    <div className="grid min-w-0 gap-1 break-words" data-ficha="evento">
      <p className="text-(length:--text-xs) font-medium text-(--color-ink-soft)">Evento</p>
      <p className="font-medium">{datos.titulo}</p>
      <p className="text-(--color-ink-soft)">
        {formatearFechaHora(datos.iniciaEn, { zona: zonaHoraria })}
      </p>
      {datos.lugar !== null ? <p className="text-(--color-ink-soft)">{datos.lugar}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{ESTADO[datos.estado]}</Badge>
        <Link
          href={`/agenda?evento=${id}` as Route}
          className="inline-flex min-h-11 items-center text-(--color-primario-ink) underline-offset-2 hover:underline md:min-h-0"
        >
          Abrir en la agenda
        </Link>
      </div>
    </div>
  )
}
