// Composición del núcleo de `logistica` en el servidor (6.01): une la lectura de la unidad con su interfaz. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import { cache } from 'react'
import type { LectorDeUnidad } from '../../entities/nucleo/repositorios'
import { unidadConIdentidad } from '../../features/nucleo/unidad-con-identidad'
import { getUnidadLeida } from '../../infra/nucleo/unidad'

// La unidad del panel (6.01): nula si no existe, está en la papelera o la persona no la ve. Se nombra por el campo principal de su
// origen (6.13).
export const leerUnidad: LectorDeUnidad = cache(async (id) =>
  unidadConIdentidad(await getUnidadLeida(id)),
)
