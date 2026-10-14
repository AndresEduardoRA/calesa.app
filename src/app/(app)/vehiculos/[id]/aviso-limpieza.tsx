import { connection } from 'next/server'
import { getAjustes } from '@/modules/empresa'
import { AvisoDeLimpieza, hoyEnZona, limpiezaDe, type Vehiculo } from '@/modules/vehiculos'

type Props = {
  vehiculo: Vehiculo
  // Si quien mira puede editar el vehículo (lo decide la base): es quien conserva.
  editable: boolean
}

// La limpieza automática en la ficha de un vehículo de subasta: «Se limpiará el dd/mm · Conservar»
// cuando le falta poco, y «Se conserva» si está marcado. La regla y la fecha son de la base. No
// dice nada si no le toca, si el interruptor está apagado o si la lectura falla.
export async function AvisoLimpieza({ vehiculo, editable }: Props) {
  await connection()
  const [limpieza, ajustes] = await Promise.all([limpiezaDe(vehiculo.id), getAjustes()])
  return (
    <AvisoDeLimpieza
      vehiculoId={vehiculo.id}
      limpieza={limpieza}
      hoy={hoyEnZona(ajustes.zonaHoraria)}
      zona={ajustes.zonaHoraria}
      editable={editable}
    />
  )
}
