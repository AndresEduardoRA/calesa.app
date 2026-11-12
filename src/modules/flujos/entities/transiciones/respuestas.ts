// Lo que devuelven las RPC de escritura de transiciones, leído con Zod en el borde: devuelven la versión nueva del flujo (`timestamptz` como texto ISO tal
// cual). Una respuesta que no se entiende es `null` (el repositorio la dice como error), nunca un dato a medias.
import { z } from 'zod'

export type VersionDeTransicion = { actualizadoEn: string }

const version = z.string().min(1)

export function versionDeTransicionDesde(crudo: unknown): VersionDeTransicion | null {
  const leida = version.safeParse(crudo)
  return leida.success ? { actualizadoEn: leida.data } : null
}
