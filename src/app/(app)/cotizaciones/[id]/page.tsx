import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { z } from 'zod'
import { leerHojaDeUnaGuardada } from '@/modules/cotizaciones'
import {
  CabeceraDeLaGuardada,
  EsqueletoDeHoja,
  PantallaDeUnaGuardada,
} from '@/modules/cotizaciones/pantallas/cotizacion'
import { requerirSesion } from '@/modules/equipo'
import { leerClienteElegido } from '@/modules/leads'
import { leerVehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { ConProveedorDeLaHoja } from '../con-proveedor-de-la-hoja'

export const metadata: Metadata = { title: 'Cotización' }

// Una cotización guardada (`docs/UX.md` › «Cotizar»): su hoja con lo que se guardó, en sólo lectura para quien no la puede guardar (`cotizaciones.ver`; P8, P13). Se llega desde el
// historial del vehículo y desde la tarjeta de lo guardado.
export default function PaginaDeUnaCotizacion({ params }: PageProps<'/cotizaciones/[id]'>) {
  return (
    <div className="grid min-w-0 gap-4">
      <Suspense fallback={<EsqueletoDeHoja />}>
        <Cotizacion params={params} />
      </Suspense>
    </div>
  )
}

// Lo que no existe, lo que está en la papelera y lo que quien mira no ve se dicen igual: decir «no tienes permiso» confirmaría que existe (como el vehículo).
function NoDisponible() {
  return (
    <EstadoVacio titulo="Esta cotización ya no está disponible: no existe o ya no tienes acceso." />
  )
}

// El cliente de la cotización, sólo con `leads.ver` (el que no se ve no se nombra); un error de la lectura sube al `error.tsx`.
async function clienteDe(permisos: Permisos, leadId: string | null) {
  return leadId === null || !puede(permisos, 'leads.ver')
    ? null
    : datosO(await leerClienteElegido(leadId))
}

// El vehículo de la cotización, si quien mira lo ve (la lectura es nula si no existe o no se ve).
async function vehiculoDe(vehiculoId: string | null) {
  return vehiculoId === null ? null : datosO(await leerVehiculo(vehiculoId))
}

async function Cotizacion({ params }: { params: PageProps<'/cotizaciones/[id]'>['params'] }) {
  await connection()
  const [sesion, { id }] = await Promise.all([requerirSesion(), params])
  if (!z.guid().safeParse(id).success) {
    return <NoDisponible />
  }
  const lectura = await leerHojaDeUnaGuardada(id)
  if (!lectura.ok) {
    if (lectura.error.codigo === 'sin_permiso') {
      return <NoDisponible />
    }
    // Sube al `error.tsx` de la pantalla, que ofrece «Reintentar».
    throw new Error(lectura.error.mensaje)
  }
  const { hoja, inicial } = lectura.data
  const { leadId, vehiculoId } = hoja.cotizacion
  // El cliente y el vehículo sólo se nombran si quien mira los ve (los ids salen de la lectura, así que van después de ella).
  const [cliente, vehiculo] = await Promise.all([
    clienteDe(sesion.permisos, leadId),
    vehiculoDe(vehiculoId),
  ])
  return (
    <>
      <CabeceraDeLaGuardada
        id={hoja.cotizacion.id}
        numero={hoja.cotizacion.numero}
        clase={hoja.cotizacion.clase}
        actualizadoEn={hoja.cotizacion.actualizadoEn}
        version={hoja.cotizacion.version}
        cadena={hoja.cadena}
        venceEl={hoja.venceEl}
        vencida={hoja.vencida}
        origen={hoja.diseno.origen.nombre}
        cliente={cliente?.nombre ?? null}
        vehiculo={vehiculo?.titulo ?? null}
      />
      <ConProveedorDeLaHoja
        origenId={hoja.cotizacion.origenId}
        cotizacionId={hoja.cotizacion.id}
        permisos={sesion.permisos}
      >
        <PantallaDeUnaGuardada
          key={hoja.cotizacion.id}
          hoja={hoja}
          inicial={inicial}
          personaId={sesion.usuarioId}
        />
      </ConProveedorDeLaHoja>
    </>
  )
}
