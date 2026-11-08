import { puede } from '@/modules/equipo'
import { SerieDeComprobantes } from '@/modules/cotizaciones/pantallas/comprobantes-empresa'
import type { Permisos } from '@/shared/lib/permisos'

type Props = {
  // La clave de la pestaña de un área que está abierta.
  pestana: string
  permisos: Permisos
  // Los parámetros de la URL, ya resueltos, como los recibe la sección de Monedas.
  parametros: Record<string, string | string[] | undefined>
}

// La sección de una pestaña del área de comprobantes (4.26-3, del carril C): «Comprobantes» dibuja la serie vigente y su cambio, con
// `empresa.ajustes.gestionar`. No usa `parametros`: no tiene estado de URL propio.
export function SeccionDeComprobantes({ pestana, permisos }: Props) {
  if (pestana !== 'comprobantes') {
    return null
  }
  return <SerieDeComprobantes puedeCambiar={puede(permisos, 'empresa.ajustes.gestionar')} />
}
