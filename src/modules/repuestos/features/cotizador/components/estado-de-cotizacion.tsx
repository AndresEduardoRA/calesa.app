import { Badge } from '@/shared/ui/badge'
import {
  ETIQUETA_DEL_ESTADO,
  type EstadoDeCotizacion as Estado,
} from '../../../entities/cotizador/cotizacion'

const VARIANTE: Readonly<Record<Estado, 'secondary' | 'default' | 'outline'>> = {
  borrador: 'secondary',
  aceptada: 'default',
  anulada: 'outline',
}

// El estado de una cotización de repuestos (8.12-3, C14): texto y color, nunca sólo color. Cambia de golpe (el `Badge` sólo anima el foco).
export function EstadoDeCotizacion({ estado }: { estado: Estado }) {
  return <Badge variant={VARIANTE[estado]}>{ETIQUETA_DEL_ESTADO[estado]}</Badge>
}
