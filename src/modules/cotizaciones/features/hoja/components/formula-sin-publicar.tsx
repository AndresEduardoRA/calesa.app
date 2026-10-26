import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'

type Props = { origen: string; puedeConfigurar: boolean }

// El origen no tiene una fórmula publicada: no hay hoja que dibujar (`docs/UX.md` › «Cotizar», estados propios). Con permiso para configurar, el enlace lleva a
// Configuración › Cotización; sin él, la pantalla sólo lo dice.
export function FormulaSinPublicar({ origen, puedeConfigurar }: Props) {
  return (
    <EstadoVacio
      titulo={`Falta publicar la fórmula de ${origen}`}
      descripcion={
        puedeConfigurar
          ? 'Sin una fórmula publicada no se puede cotizar en este origen.'
          : 'Sin una fórmula publicada no se puede cotizar en este origen. Avisa a quien configura las cotizaciones.'
      }
      accion={
        puedeConfigurar ? (
          <Link
            href={RUTAS.configuracionDeCotizacion as Route}
            className={buttonVariants({ className: 'min-h-11 md:min-h-8' })}
          >
            Ir a la configuración de cotización
          </Link>
        ) : undefined
      }
    />
  )
}
