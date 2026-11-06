import type { ReactNode } from 'react'
import { ProveedorDeLaTarjeta } from '@/modules/cotizaciones/pantallas/tarjeta'
import { getAjustes } from '@/modules/empresa'
import { urlPublicaONull } from '@/shared/lib/almacen'

export type PropsDeLaTarjeta = {
  // El título del vehículo si quien mira lo ve; sin vehículo la tarjeta no lleva banda.
  vehiculo: string | null
  // «Asesor:» de la tarjeta: quien cotiza en la hoja nueva y quien creó la cotización en una guardada (P2 a); nulo, no va.
  asesor: string | null
  // Una guardada: su número, si venció y el último guardado (la fecha del encabezado, P3 a). La hoja nueva: nulos.
  numero?: number | null
  vencida?: boolean
  guardadaEl?: string | null
}

// La pantalla de la hoja (`/cotizaciones/nuevo` y `/cotizaciones/[id]`) con «Vista previa» (4.18-2): el proveedor del área `tarjeta` con lo que sólo la página sabe (el asesor, el
// vehículo, el logo de la empresa). Sin él la hoja no dibuja el botón.
export async function ConLaTarjeta({
  vehiculo,
  asesor,
  numero = null,
  vencida = false,
  guardadaEl = null,
  children,
}: PropsDeLaTarjeta & { children: ReactNode }) {
  const ajustes = await getAjustes()
  const url = urlPublicaONull('marca', ajustes.logoRuta)
  return (
    <ProveedorDeLaTarjeta
      vehiculo={vehiculo}
      asesor={asesor}
      numero={numero}
      vencida={vencida}
      guardadaEl={guardadaEl}
      logo={url === null ? null : { nombre: ajustes.nombre, url }}
    >
      {children}
    </ProveedorDeLaTarjeta>
  )
}
