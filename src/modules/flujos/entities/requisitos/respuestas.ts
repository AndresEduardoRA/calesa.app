// Lo que devuelven las RPC de escritura de requisitos, leído con Zod en el borde: las tres devuelven la versión nueva del flujo (`timestamptz` como texto
// ISO tal cual). Una respuesta que no se entiende es `null` (el repositorio la dice como error), nunca un dato a medias.
import { z } from 'zod'

export type VersionNueva = { actualizadoEn: string }

const version = z.string().min(1)

// `requisito_crear`, `requisito_mover` y `requisito_eliminar`.
export function versionNuevaDesde(crudo: unknown): VersionNueva | null {
  const leida = version.safeParse(crudo)
  return leida.success ? { actualizadoEn: leida.data } : null
}
