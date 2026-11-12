'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import {
  estaVencida,
  puedeCompletarDesdeFicha,
  type DatosDeFichaDeTarea,
} from '../../../entities/fichas'
import type { ContextoDeFichas } from '../contexto-de-fichas'
import { useCompletarFicha } from '../hooks/use-completar-ficha'

const ESTADO = { pendiente: 'Pendiente', completado: 'Hecha', cancelado: 'Cancelada' } as const

type Props = {
  id: string
  datos: DatosDeFichaDeTarea
  usuarioId: string
  fichas: ContextoDeFichas
}

// La tarea creada desde el chat: su estado a la vista y, para su responsable, completarla o reabrirla sin salir. Con el texto al 200 % nada se sale.
export function FichaDeTarea({ id, datos, usuarioId, fichas }: Props) {
  const { zonaHoraria } = useRegional()
  const completar = useCompletarFicha(id, datos, fichas)
  const vencida = estaVencida(datos, new Date().toISOString())
  const para =
    datos.responsableId.toLowerCase() === usuarioId.toLowerCase()
      ? 'Para ti'
      : datos.responsableNombre !== null
        ? `Para ${datos.responsableNombre}`
        : 'Sin responsable visible'
  return (
    <div className="grid min-w-0 gap-1 break-words" data-ficha="tarea">
      <p className="text-(length:--text-xs) font-medium text-(--color-ink-soft)">Tarea</p>
      <p className="font-medium">{datos.titulo}</p>
      <p className="text-(--color-ink-soft)">{para}</p>
      <p className="text-(--color-ink-soft)">
        {datos.venceEn === null
          ? 'Sin fecha'
          : `Vence ${formatearFechaHora(datos.venceEn, { zona: zonaHoraria })}`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={datos.estado === 'completado' ? 'secondary' : 'outline'}>
          {ESTADO[datos.estado]}
        </Badge>
        {vencida ? <Badge variant="destructive">Vencida</Badge> : null}
        <Link
          href={`/agenda?tarea=${id}` as Route}
          className="inline-flex min-h-11 items-center text-(--color-primario-ink) underline-offset-2 hover:underline md:min-h-0"
        >
          Abrir en la agenda
        </Link>
      </div>
      {puedeCompletarDesdeFicha(datos, usuarioId) ? (
        <div className="grid justify-items-start gap-1">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-8"
            disabled={completar.enCurso}
            aria-label={`${completar.hecha ? 'Reabrir' : 'Marcar como hecha'}: ${datos.titulo}`}
            onClick={() => {
              void completar.completar()
            }}
          >
            {completar.hecha ? 'Reabrir' : 'Marcar como hecha'}
          </Button>
          {completar.error !== null ? (
            <div role="alert" className="grid justify-items-start gap-1 text-(--color-peligro-ink)">
              <p>{completar.error}</p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 md:min-h-8"
                onClick={completar.reintentar}
              >
                Reintentar
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
