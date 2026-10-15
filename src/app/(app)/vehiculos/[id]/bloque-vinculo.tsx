import {
  BotonDesvincular,
  VinculoEInteresados,
  leerRelaciones,
  type Vehiculo,
} from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'

type Props = { vehiculo: Vehiculo; editable: boolean }

// El vínculo y los interesados del vehículo, debajo de su ficha. Se vinculan y se marcan desde la ficha
// del lead; acá, quien edita el vehículo puede desvincularlo.
export async function BloqueVinculo({ vehiculo, editable }: Props) {
  const relaciones = datosO(await leerRelaciones(vehiculo.id))
  return (
    <VinculoEInteresados
      relaciones={relaciones}
      desvincular={
        editable ? (
          <BotonDesvincular
            vehiculo={{
              id: vehiculo.id,
              titulo: vehiculo.titulo,
              numero: vehiculo.numero,
              actualizadoEn: vehiculo.actualizadoEn,
            }}
          />
        ) : null
      }
    />
  )
}
