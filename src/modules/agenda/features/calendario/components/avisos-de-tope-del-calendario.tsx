import type { Route } from 'next'
import Link from 'next/link'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { claseDe, type AgendaDeRango, type ClaveDeClase } from '../../../entities/agenda'

type Props = {
  hayMas: AgendaDeRango['hayMas']
  clases: readonly ClaveDeClase[]
  // El día que ancla la vista, para acortar el rango; nulo si ya se está en la vista de día.
  enlaceDelDia: string | null
}

// Al pie del calendario: de cada clase que se ve y llegó a su tope, el aviso con el camino a lo que quedó afuera.
export function AvisosDeTopeDelCalendario({ hayMas, clases, enlaceDelDia }: Props) {
  return clases
    .filter((clave) => hayMas[clave])
    .map((clave) => (
      <AvisoDeTope
        key={clave}
        texto={`Hay más ${claseDe(clave).plural} de las que se muestran. Acorta el rango o quita clases del filtro.`}
        camino={
          enlaceDelDia ? (
            <Link href={enlaceDelDia as Route} className="underline">
              Ver el día
            </Link>
          ) : undefined
        }
      />
    ))
}
