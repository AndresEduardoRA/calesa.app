import { CalendarClockIcon, ShieldCheckIcon } from 'lucide-react'
import { avisoDeLimpieza, textoDeAviso, type LimpiezaDeVehiculo } from '../../../entities/limpieza'
import { BotonConservar } from './boton-conservar'

type Props = {
  vehiculoId: string
  limpieza: LimpiezaDeVehiculo | null
  // El día de hoy en la zona de la empresa (`YYYY-MM-DD`) y esa zona.
  hoy: string
  zona: string
  // Si quien mira puede editar el vehículo (lo decide la base): es quien conserva.
  editable: boolean
}

const SIN_PERMISO = 'No tienes permiso para editar este vehículo.'

// La limpieza automática en la ficha:
//  · a punto de irse (dentro de la ventana): banner arriba, con «Conservar»;
//  · todavía lejos: una línea discreta con la fecha, para que nadie se sorprenda;
//  · conservado: «Se conserva · lo marcó X el dd/mm», con «Quitar».
// Con el interruptor apagado, o si no le toca, no dice nada.
export function AvisoDeLimpieza({ vehiculoId, limpieza, hoy, zona, editable }: Props) {
  const aviso = avisoDeLimpieza(limpieza, hoy, zona)
  if (aviso.tipo === 'oculto') {
    return null
  }
  const texto = textoDeAviso(aviso)
  if (aviso.tipo === 'pronto') {
    return (
      <section
        aria-label="Limpieza automática"
        className="flex flex-wrap items-center justify-between gap-2 rounded-(--radius-md) bg-(--color-aviso-soft) px-3 py-2.5 text-(length:--text-sm) text-(--color-aviso-ink)"
      >
        <p className="flex min-w-0 items-center gap-2">
          <CalendarClockIcon aria-hidden className="size-4 shrink-0" />
          <span>{texto}. Si lo necesitas, conservarlo evita que se vaya a la papelera.</span>
        </p>
        <BotonConservar
          vehiculoId={vehiculoId}
          conservar
          habilitado={editable}
          motivo={SIN_PERMISO}
        />
      </section>
    )
  }
  const conservado = aviso.tipo === 'conservado'
  return (
    <section
      aria-label="Limpieza automática"
      className="flex flex-wrap items-center justify-between gap-2 text-(length:--text-sm) text-(--color-ink-soft)"
    >
      <p className="flex min-w-0 items-center gap-2">
        {conservado ? (
          <ShieldCheckIcon aria-hidden className="size-4 shrink-0" />
        ) : (
          <CalendarClockIcon aria-hidden className="size-4 shrink-0" />
        )}
        <span>{texto}</span>
      </p>
      <BotonConservar
        vehiculoId={vehiculoId}
        conservar={!conservado}
        habilitado={editable}
        motivo={SIN_PERMISO}
      />
    </section>
  )
}
