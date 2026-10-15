'use client'

import { BellIcon } from 'lucide-react'
import { fechaRelativa, formatearFechaHora } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { EstadoDelRecordatorio, Recordatorio } from '../../../entities/recordatorios'
import { nombreDelVehiculoDeNota } from '../../../entities/vehiculo-de-nota'

type Props = {
  recordatorio: Recordatorio
  estado: EstadoDelRecordatorio
  zona: string
  enCurso: boolean
  alCompletar: (completado: boolean) => void
  alEditar: () => void
  alEliminar: () => void
}

// Un recordatorio: de qué es, cuándo y su estado dicho con texto (no sólo con color).
// Cuándo avisa y, si tiene uno, el vehículo (nombrado si todavía lo ve).
function CuandoYVehiculo({ recordatorio, zona }: { recordatorio: Recordatorio; zona: string }) {
  const vehiculo = nombreDelVehiculoDeNota(recordatorio)
  return (
    <p className="text-(length:--text-xs) text-(--color-ink-soft)">
      <time
        dateTime={recordatorio.recordarEn}
        title={formatearFechaHora(recordatorio.recordarEn, { zona })}
      >
        {formatearFechaHora(recordatorio.recordarEn, { zona })} ·{' '}
        {fechaRelativa(recordatorio.recordarEn, { zona })}
      </time>
      {vehiculo ? ` · ${vehiculo}` : null}
    </p>
  )
}

export function ItemDeRecordatorio({
  recordatorio,
  estado,
  zona,
  enCurso,
  alCompletar,
  alEditar,
  alEliminar,
}: Props) {
  const completado = estado === 'completado'
  return (
    <article
      aria-label={recordatorio.titulo}
      className={`grid gap-1.5 rounded-(--radius-md) border p-2.5 ${
        estado === 'vencido'
          ? 'border-(--color-aviso) bg-(--color-aviso-soft)'
          : 'border-(--color-line) bg-(--color-surface)'
      }`}
    >
      <div className="flex items-start gap-2">
        <BellIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-(--color-ink-faint)" />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p
            className={`text-(length:--text-sm) font-medium break-words text-(--color-ink) ${completado ? 'line-through' : ''}`}
          >
            {recordatorio.titulo}
          </p>
          <CuandoYVehiculo recordatorio={recordatorio} zona={zona} />
        </div>
        {estado === 'vencido' ? <Badge variant="outline">Vencido</Badge> : null}
        {completado ? <Badge variant="secondary">Completado</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-7"
          onClick={() => {
            alCompletar(!completado)
          }}
          disabled={enCurso}
        >
          {completado ? 'Reabrir' : 'Completar'}
        </Button>
        {completado ? null : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-11 md:min-h-7"
            onClick={alEditar}
            disabled={enCurso}
          >
            Editar
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11 md:min-h-7"
          onClick={alEliminar}
          disabled={enCurso}
        >
          Eliminar
        </Button>
      </div>
    </article>
  )
}
