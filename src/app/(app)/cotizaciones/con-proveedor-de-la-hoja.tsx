import type { ReactNode } from 'react'
import { HUECOS_DE_FORMULA_EN_LA_HOJA } from '@/modules/cotizaciones/pantallas/formula-hoja'
import type { Permisos } from '@/shared/lib/permisos'

type Props = {
  origenId: string
  // Nulo en la hoja nueva.
  cotizacionId: string | null
  permisos: Permisos
  children: ReactNode
}

// La pantalla de la hoja (`/cotizaciones/nuevo` y `/cotizaciones/[id]`) con el `Proveedor` que llenó el área `formula` (el ⚙ de una celda, 4.20), si lo hay. Hoy no hay: la
// página no dibuja ningún elemento más (4.15-6a).
export function ConProveedorDeLaHoja({ origenId, cotizacionId, permisos, children }: Props) {
  const { Proveedor } = HUECOS_DE_FORMULA_EN_LA_HOJA
  return Proveedor ? (
    <Proveedor origenId={origenId} cotizacionId={cotizacionId} permisos={permisos}>
      {children}
    </Proveedor>
  ) : (
    children
  )
}
