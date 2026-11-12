import type { EstadoDeDocumento } from './documento'

// El texto del estado de un documento: siempre texto, el color es un refuerzo (`ui.md`). «pendiente» es una fila sin archivo: la RPC de registrar nunca la escribe, pero el enum la trae.
export const ETIQUETA_DEL_ESTADO: Record<EstadoDeDocumento, string> = {
  pendiente: 'Sin subir',
  subido: 'Subido',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

export type TonoDelEstado = 'secondary' | 'default' | 'destructive'

/** La variante de `<Badge>` de cada estado. */
export function tonoDelEstado(estado: EstadoDeDocumento): TonoDelEstado {
  switch (estado) {
    case 'aprobado':
      return 'default'
    case 'rechazado':
      return 'destructive'
    case 'pendiente':
    case 'subido':
      return 'secondary'
  }
}
