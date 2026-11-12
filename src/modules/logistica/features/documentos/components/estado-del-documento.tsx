import { Badge } from '@/shared/ui/badge'
import type { EstadoDeDocumento } from '../../../entities/documentos/documento'
import { ETIQUETA_DEL_ESTADO, tonoDelEstado } from '../../../entities/documentos/estado'

// El estado de un documento: siempre con su texto; el color es un refuerzo, nunca lo único.
export function EstadoDelDocumento({ estado }: { estado: EstadoDeDocumento }) {
  return <Badge variant={tonoDelEstado(estado)}>{ETIQUETA_DEL_ESTADO[estado]}</Badge>
}
