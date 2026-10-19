import { connection } from 'next/server'
import { integracionActiva } from '@/modules/empresa'
import { fotosPorTraerDe, leerGaleria, leerSubasta } from '@/modules/vehiculos'
import { SeccionDeFotos } from '@/modules/vehiculos/pantallas/ficha'
import { datosO } from '@/shared/lib/errores'

type Props = {
  vehiculoId: string
  origenId: string
  // El vehículo es de un origen de subasta: puede tener fotos por traer de apibara.
  deSubasta: boolean
  // Si quien mira puede cambiar las fotos de este vehículo.
  puedeEditar: boolean
}

// La pestaña «Fotos»: las del vehículo, con lo que se puede hacer con ellas. Se leen recién al
// abrir la pestaña. En un origen de subasta con apibara encendida, además, las que trajo la
// respuesta guardada y todavía no están.
export async function SeccionFotos({ vehiculoId, origenId, deSubasta, puedeEditar }: Props) {
  await connection()
  const [galeria, subasta, activa] = await Promise.all([
    leerGaleria(vehiculoId),
    deSubasta ? leerSubasta(vehiculoId) : null,
    deSubasta ? integracionActiva('apibara') : false,
  ])
  const fotas = activa && subasta ? fotosPorTraerDe(datosO(subasta)) : []
  return (
    <SeccionDeFotos
      vehiculoId={vehiculoId}
      galeria={datosO(galeria)}
      puedeEditar={puedeEditar}
      {...(fotas.length > 0 ? { deSubasta: { origenId, fotas } } : {})}
    />
  )
}
