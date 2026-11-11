import type { Route } from 'next'
import Link from 'next/link'
import { formatearHora } from '@/shared/lib/fechas'
import { claseDe, type ClaveDeClase, type EntradaDeAgenda } from '../../../entities/agenda'

// Un color por clase, de los tokens de siempre (nunca sólo color: el chip dice su clase con texto).
const ESTILO_DE_CLASE: Record<ClaveDeClase, string> = {
  evento: 'bg-(--color-info-soft) text-(--color-info-ink)',
  tarea: 'bg-(--color-positivo-soft) text-(--color-positivo-ink)',
  recordatorio: 'bg-(--color-aviso-soft) text-(--color-aviso-ink)',
  subasta: 'bg-(--color-visitado-soft) text-(--color-ink)',
}

type Props = {
  entrada: EntradaDeAgenda
  // La zona de la empresa: la hora no es la del navegador ni la del servidor.
  zona: string
}

// Una cosa de la agenda, en un día. Lleva su clase con texto, la hora y el título; con `ruta` es un enlace (hoy sólo la subasta, a su vehículo).
export function ChipEvento({ entrada, zona }: Props) {
  const clase = claseDe(entrada.clave)
  const contenido = (
    <>
      <span className="font-semibold">{clase.nombre}</span>{' '}
      <span className="tabular-nums">{formatearHora(entrada.instante, { zona })}</span>{' '}
      <span className={entrada.hecha ? 'line-through' : undefined}>{entrada.titulo}</span>
      {entrada.hecha ? <span> · Hecha</span> : null}
      {entrada.detalle ? <span className="sr-only"> ({entrada.detalle})</span> : null}
    </>
  )
  const estilo = `block min-w-0 rounded-md px-2 py-1 text-(length:--text-sm) break-words ${ESTILO_DE_CLASE[entrada.clave]}`
  return entrada.ruta ? (
    <Link
      href={entrada.ruta as Route}
      title={entrada.detalle ?? undefined}
      className={`${estilo} transition hover:brightness-95 max-md:min-h-11`}
    >
      {contenido}
    </Link>
  ) : (
    <span title={entrada.detalle ?? undefined} className={estilo}>
      {contenido}
    </span>
  )
}
