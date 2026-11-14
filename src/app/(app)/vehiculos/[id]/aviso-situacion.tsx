import { connection } from 'next/server'
import { getAjustes } from '@/modules/empresa'
import type { Permisos } from '@/modules/equipo'
import { CLAVE_DE_GANADA, VALOR_DE_GANADA } from '@/modules/logistica'
import { puedeResolverLaSubasta, resolucionDeSubasta, type Vehiculo } from '@/modules/vehiculos'
import { AvisoDeSituacion } from '@/modules/vehiculos/pantallas/ficha'
import { formatearFecha } from '@/shared/lib/fechas'
import { unidadDeLogistica } from '@/shared/lib/rutas'

type Props = {
  vehiculo: Vehiculo
  origen: { id: string; nombre: string }
  fase: { nombre: string } | null
  permisos: Permisos
}

// La situación de la subasta en la ficha (sólo «Sin resolver» o «No ganada»): «La ganamos» lleva al mover de logística en su modo (`vehiculos` no
// conoce `logistica`: el enlace lo arma la página); de una no ganada, quién la marcó y cuándo (si la lectura falla, sin el nombre).
export async function AvisoSituacion({ vehiculo, origen, fase, permisos }: Props) {
  await connection()
  const [resolucion, ajustes] = await Promise.all([
    vehiculo.situacion === 'no_ganada' ? resolucionDeSubasta(vehiculo.id) : Promise.resolve(null),
    getAjustes(),
  ])
  return (
    <AvisoDeSituacion
      vehiculoId={vehiculo.id}
      origen={origen}
      situacion={vehiculo.situacion}
      fase={fase?.nombre ?? null}
      puede={puedeResolverLaSubasta(permisos, origen.id)}
      hrefLaGanamos={`${unidadDeLogistica(vehiculo.id)}?${CLAVE_DE_GANADA}=${VALOR_DE_GANADA}`}
      resolucion={resolucion}
      fecha={
        resolucion?.resueltaEn
          ? formatearFecha(resolucion.resueltaEn, { zona: ajustes.zonaHoraria })
          : null
      }
    />
  )
}
