// Lo que apibara trajo para los vehículos de un origen y el origen no tiene como campo: un dato
// que la API suma después de que el origen nació. Nada se pierde (queda en la respuesta guardada);
// acá se le ofrece al dueño agregarlo como campo.
import { z } from 'zod'

export type DatoNuevoDeApibara = {
  // Su ruta en la respuesta (`pricing.nuevo_dato`): es también su `clave_apibara`.
  ruta: string
  // Cómo vino: número, sí o no, o texto.
  tipo: 'number' | 'boolean' | 'string'
  // Un valor de ejemplo, recortado.
  ejemplo: string | null
}

const esquemaFilas = z.array(
  z.object({
    ruta: z.string().min(1),
    tipo: z.enum(['number', 'boolean', 'string']).catch('string'),
    ejemplo: z.string().nullable().catch(null),
  }),
)

export function datosNuevosDesde(filas: unknown): DatoNuevoDeApibara[] {
  const leidas = esquemaFilas.safeParse(filas)
  return leidas.success ? leidas.data : []
}

// «apibara trae 3 datos que este origen no usa.»
export function textoDeDatosNuevos(cantidad: number): string {
  return cantidad === 1
    ? 'apibara trae 1 dato que este origen no usa.'
    : `apibara trae ${String(cantidad)} datos que este origen no usa.`
}
