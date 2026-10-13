import { SeccionDeFotos, leerGaleria } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'

type Props = {
  vehiculoId: string
  // Si quien mira puede cambiar las fotos de este vehículo.
  puedeEditar: boolean
}

// La pestaña «Fotos»: las del vehículo, con lo que se puede hacer con ellas. Se leen recién al
// abrir la pestaña.
export async function SeccionFotos({ vehiculoId, puedeEditar }: Props) {
  const galeria = datosO(await leerGaleria(vehiculoId))
  return <SeccionDeFotos vehiculoId={vehiculoId} galeria={galeria} puedeEditar={puedeEditar} />
}
