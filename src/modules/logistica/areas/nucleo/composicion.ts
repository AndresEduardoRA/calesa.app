// Composición del núcleo de `logistica` en el servidor (6.01): une la lectura de la unidad con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { LectorDeUnidad } from '../../entities/nucleo/repositorios'
import { getUnidad } from '../../infra/nucleo/unidad'

// La unidad del panel (6.01): nula si no existe, está en la papelera o la persona no la ve.
export const leerUnidad: LectorDeUnidad = getUnidad
