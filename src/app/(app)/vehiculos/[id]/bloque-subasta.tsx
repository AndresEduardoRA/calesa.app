import { connection } from 'next/server'
import { getAjustes, integracionActiva } from '@/modules/empresa'
import { puede, requerirSesion } from '@/modules/equipo'
import { BloqueDeSubasta, leerSubasta, type Vehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'

type Props = {
  vehiculo: Vehiculo
  // Si quien mira puede editar el vehículo (lo decide la base).
  editable: boolean
}

// La subasta de un vehículo de un origen de subasta, arriba de su ficha: fecha, estado, cuánto va y
// «Refrescar». No se dibuja si el vehículo no tiene nada de apibara y no hay cómo traerlo.
export async function BloqueSubasta({ vehiculo, editable }: Props) {
  await connection()
  const [sesion, subasta, ajustes, activa] = await Promise.all([
    requerirSesion(),
    leerSubasta(vehiculo.id),
    getAjustes(),
    integracionActiva('apibara'),
  ])
  const datos = datosO(subasta)
  if (!datos || (datos.sincronizadoEn === null && datos.subastaEn === null && !activa)) {
    return null
  }
  return (
    <BloqueDeSubasta
      vehiculo={vehiculo}
      subasta={{ ...datos, raw: null }}
      ahora={new Date().toISOString()}
      zona={ajustes.zonaHoraria}
      puedeRefrescar={activa && editable}
      puedeConfigurar={puede(sesion.permisos, 'empresa.ajustes.gestionar')}
    />
  )
}
