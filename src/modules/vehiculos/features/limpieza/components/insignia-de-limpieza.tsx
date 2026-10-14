import { CalendarClockIcon } from 'lucide-react'
import { formatearDiaYMes } from '@/shared/lib/fechas'
import { seLimpiaPronto } from '../../../entities/limpieza'

type Props = {
  // `YYYY-MM-DD` (la columna calculada del vehículo) y el día de hoy en la zona de la empresa.
  fecha: string | null
  hoy: string | null
}

// «Se limpia el 16/10»: lo que la limpieza automática va a mandar a la papelera en los próximos
// días. Texto e ícono, nunca sólo color. No dice nada fuera de la ventana ni si está apagada.
export function InsigniaDeLimpieza({ fecha, hoy }: Props) {
  if (hoy === null || !seLimpiaPronto(fecha, hoy) || fecha === null) {
    return null
  }
  return (
    <span className="inline-flex h-5 max-w-full items-center gap-1 rounded-(--radius-pill) border border-transparent bg-(--color-aviso-soft) px-2 text-(length:--text-xs) font-medium whitespace-nowrap text-(--color-aviso-ink)">
      <CalendarClockIcon aria-hidden className="size-3 shrink-0" />
      Se limpia el {formatearDiaYMes(fecha)}
    </span>
  )
}
