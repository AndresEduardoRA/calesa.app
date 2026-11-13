import Link from 'next/link'
import { EstadoVacio } from '@/shared/ui/estados'

// Sin movimiento en todo el período. Un cero es un dato, pero una gráfica toda en cero no dice nada: se dice con palabras.
// «Nuevo lead» sólo en lo de leads y sólo con permiso; crear una cotización exige elegir lead y vehículo, así que no se ofrece.
export function VacioDeGrafica({
  sustantivo,
  puedeCrear,
}: {
  sustantivo: 'leads' | 'cotizaciones' | 'turnos de la web'
  puedeCrear: boolean
}) {
  return (
    <EstadoVacio
      compacto
      titulo={`Todavía no hay ${sustantivo} en este período`}
      accion={
        puedeCrear ? (
          <Link
            href="/leads?panel=nuevo-lead"
            className="w-fit text-(length:--text-sm) text-(--color-primario) underline underline-offset-2"
          >
            Nuevo lead
          </Link>
        ) : undefined
      }
    />
  )
}
