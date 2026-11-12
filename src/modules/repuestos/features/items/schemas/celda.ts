import { z } from 'zod'
import { COLUMNAS_EDITABLES } from '../../../entities/items/celda'

// Lo que cruza al servidor al guardar una celda (8.09-2, C9). Sólo las diez columnas editables: ni la fase, ni el stock, ni `eliminado_en`, ni `proyecto_id`. El valor es texto, número o nulo;
// su regla por columna es de `cambioDeCelda`. `moneda` es la que se escribe junto al precio si el ítem aún no tenía.
export const esquemaGuardarCelda = z.object({
  id: z.guid(),
  columna: z.enum(COLUMNAS_EDITABLES),
  valor: z.union([z.string().max(5000), z.number(), z.null()]),
  actualizadoEn: z.string().min(1).max(64),
  moneda: z.string().length(3).optional(),
})
