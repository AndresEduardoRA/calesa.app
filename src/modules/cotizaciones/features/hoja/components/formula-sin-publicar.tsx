import type { ReactNode } from 'react'
import { EstadoVacio } from '@/shared/ui/estados'

type Props = {
  origen: string
  puedeConfigurar: boolean
  // El enlace a Configuración › Cotización, del área `formula` (`HUECOS_DE_FORMULA_EN_LA_HOJA`): la página lo pasa sólo a quien puede configurar.
  accion?: ReactNode
}

// El origen no tiene una fórmula publicada: no hay hoja que dibujar (`docs/UX.md` › «Cotizar», estados propios). Con permiso para configurar, la `accion` (un enlace a
// Configuración › Cotización) va bajo el texto; sin él, la pantalla sólo lo dice.
export function FormulaSinPublicar({ origen, puedeConfigurar, accion }: Props) {
  return (
    <EstadoVacio
      titulo={`Falta publicar la fórmula de ${origen}`}
      descripcion={
        puedeConfigurar
          ? 'Sin una fórmula publicada no se puede cotizar en este origen.'
          : 'Sin una fórmula publicada no se puede cotizar en este origen. Avisa a quien configura las cotizaciones.'
      }
      accion={puedeConfigurar ? accion : undefined}
    />
  )
}
