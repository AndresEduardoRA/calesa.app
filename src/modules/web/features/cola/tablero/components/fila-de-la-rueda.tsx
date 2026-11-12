import { fechaRelativa } from '@/shared/lib/fechas'
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { Badge } from '@/shared/ui/badge'
import type { FilaDelTablero } from '../../../../entities/cola/tablero'

type Props = {
  fila: FilaDelTablero
  // El puesto en el orden de la ruleta; sin él, la fila no está entre las elegibles.
  puesto?: number
  // Por qué hoy no recibe un turno nuevo, si no lo recibe.
  motivo?: string
}

// Una persona habilitada en la cola: lo que pesa en la ruleta (disponible, abiertas de su cupo, prioridad) y cómo le fue (tasa de contacto, vencidas,
// última asignación). Recibe la fila entera: la 8.04-3 suma aquí «Quitar de la rueda».
export function FilaDeLaRueda({ fila, puesto, motivo }: Props) {
  const tasa =
    fila.tasaContactoPct === null
      ? 'Sin turnos aún'
      : `Contacta el ${formatearPorcentaje(fila.tasaContactoPct / 100)}`
  return (
    <li className="grid min-w-0 gap-1 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {puesto === undefined ? null : (
          <span className="text-(--color-ink-soft) tabular-nums">{formatearNumero(puesto)}.</span>
        )}
        <span className="min-w-0 font-medium break-words text-(--color-ink)">{fila.nombre}</span>
        {fila.cuentaActiva ? (
          <Badge variant={fila.disponible ? 'secondary' : 'outline'}>
            {fila.disponible ? 'Disponible' : 'No disponible'}
          </Badge>
        ) : null}
        {/* En la rueda, el motivo ya lo dice. */}
        {fila.faltaWhatsapp && !motivo ? (
          <Badge variant="destructive">Le falta el WhatsApp</Badge>
        ) : null}
      </div>
      {motivo ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{motivo}</p> : null}
      <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-(length:--text-sm) text-(--color-ink-soft)">
        <span className="tabular-nums">
          {formatearNumero(fila.abiertas)} de {formatearNumero(fila.cupo)} abiertas
          {fila.maxAbiertas === null ? ' (hereda la política)' : ''}
        </span>
        <span className="tabular-nums">Prioridad {formatearNumero(fila.prioridad)}</span>
        <span className="tabular-nums">{tasa}</span>
        <span className="tabular-nums">
          {formatearNumero(fila.vencidasTotal)} {fila.vencidasTotal === 1 ? 'vencida' : 'vencidas'}
        </span>
        <span>
          Último turno: {fila.ultimaAsignacionEn ? fechaRelativa(fila.ultimaAsignacionEn) : 'nunca'}
        </span>
      </p>
    </li>
  )
}
