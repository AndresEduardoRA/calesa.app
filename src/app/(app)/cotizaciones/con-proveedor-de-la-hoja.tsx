import type { ReactNode } from 'react'
import { HUECOS_DE_FORMULA_EN_LA_HOJA } from '@/modules/cotizaciones/pantallas/formula-hoja'
import type { Permisos } from '@/shared/lib/permisos'
import { ConLaTarjeta, type PropsDeLaTarjeta } from './con-la-tarjeta'

type Props = {
  origenId: string
  // Nulo en la hoja nueva.
  cotizacionId: string | null
  permisos: Permisos
  // Lo que sólo la página sabe de la tarjeta de «Vista previa» (4.18-2).
  tarjeta: PropsDeLaTarjeta
  children: ReactNode
}

// La pantalla de la hoja (`/cotizaciones/nuevo` y `/cotizaciones/[id]`) con el `Proveedor` que llenó el área `formula` (el ⚙ de una celda, 4.20), si lo hay. Hoy no hay: la
// página no dibuja ningún elemento más (4.15-6a). Y con «Vista previa» (4.18-2): el proveedor del área `tarjeta` va por dentro.
export function ConProveedorDeLaHoja({
  origenId,
  cotizacionId,
  permisos,
  tarjeta,
  children,
}: Props) {
  const { Proveedor } = HUECOS_DE_FORMULA_EN_LA_HOJA
  const conLaTarjeta = <ConLaTarjeta {...tarjeta}>{children}</ConLaTarjeta>
  return Proveedor ? (
    <Proveedor origenId={origenId} cotizacionId={cotizacionId} permisos={permisos}>
      {conLaTarjeta}
    </Proveedor>
  ) : (
    conLaTarjeta
  )
}
