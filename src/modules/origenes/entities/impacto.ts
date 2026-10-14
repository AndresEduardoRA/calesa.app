// Lo que cambiaría una edición del layout de un origen, contado por la base antes de hacerla, y cómo
// se dice. Las reglas son del motor (`shared/lib/campos`); acá se dicen con «vehículo».
import {
  resumenDeEliminacion as eliminacion,
  resumenDeImpacto as impacto,
  type ImpactoDeCampo,
  type ResumenDeImpacto,
  type Sustantivo,
} from '@/shared/lib/campos'
import type { CambiosDeCampo } from './cambios-de-campo'
import type { CampoDeLayout } from './campo'

export { impactoDesde, type ImpactoDeCampo, type ResumenDeImpacto } from '@/shared/lib/campos'

const VEHICULO: Sustantivo = { singular: 'vehículo', plural: 'vehículos' }

// Dice, con los números, qué le pasa a lo ya cargado si se hace este cambio.
export function resumenDeImpacto(
  campo: CampoDeLayout,
  cambios: CambiosDeCampo,
  conteo: ImpactoDeCampo,
): ResumenDeImpacto {
  return impacto(campo, cambios, conteo, VEHICULO)
}

// Eliminar un campo propio: sólo si ningún vehículo tiene un valor en él.
export function resumenDeEliminacion(
  campo: CampoDeLayout,
  conteo: ImpactoDeCampo,
): ResumenDeImpacto {
  return eliminacion(campo, conteo, VEHICULO)
}
