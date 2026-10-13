import { ArrowRightIcon, CircleDashedIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { buttonVariants } from '@/shared/ui/button'
import type { PasoConDestino } from '../../../entities/pasos'

type Props = { nombre: string; pasos: readonly PasoConDestino[] }

function Destino({ paso }: { paso: PasoConDestino }) {
  if (paso.motivoDeshabilitado) {
    return (
      <span className="text-(length:--text-sm) text-(--color-ink-faint)">
        {paso.motivoDeshabilitado}
      </span>
    )
  }
  if (paso.ruta === null) {
    return (
      <span className="text-(length:--text-sm) text-(--color-ink-faint)">
        Se configura en una próxima etapa: todavía no hay pantalla.
      </span>
    )
  }
  return (
    <Link
      // La ruta la declara `app/` y un test comprueba que existe.
      href={paso.ruta as Route}
      className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-8' })}
    >
      Abrir
      <ArrowRightIcon aria-hidden />
    </Link>
  )
}

// Lo que le falta a un origen para funcionar, derivado de lo que hay. Sólo muestra lo pendiente y
// sólo lleva a pantallas que existen: lo que todavía no tiene pantalla se dice, sin enlace.
export function SiguientesPasos({ nombre, pasos }: Props) {
  const pendientes = pasos.filter((paso) => paso.pendiente)
  if (pendientes.length === 0) {
    return null
  }
  return (
    <section
      aria-labelledby="pasos-titulo"
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4"
    >
      <h2 id="pasos-titulo" className="text-(length:--text-base) font-medium text-(--color-ink)">
        Siguientes pasos para {nombre}
      </h2>
      <ul className="grid gap-3">
        {pendientes.map((paso) => (
          <li
            key={paso.clave}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <CircleDashedIcon
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-(--color-ink-faint)"
              />
              <div className="grid gap-0.5">
                <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
                  {paso.titulo}
                </span>
                <span className="text-(length:--text-sm) text-(--color-ink-soft)">
                  {paso.detalle}
                </span>
              </div>
            </div>
            <Destino paso={paso} />
          </li>
        ))}
      </ul>
    </section>
  )
}
