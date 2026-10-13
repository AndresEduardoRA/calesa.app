import { VinculoEInteresados, leerRelaciones } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'

// El vínculo y los interesados del vehículo, debajo de su ficha. Sólo lectura: se escriben desde
// la ficha del lead (Fase 3).
export async function BloqueVinculo({ vehiculoId }: { vehiculoId: string }) {
  const relaciones = datosO(await leerRelaciones(vehiculoId))
  return <VinculoEInteresados relaciones={relaciones} />
}
