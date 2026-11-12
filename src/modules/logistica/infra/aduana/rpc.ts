import 'server-only'

// Lo que comparten las lecturas de aduana por RPC (6.09). Cada área lleva lo suyo: un área no importa otra (`scripts/guardas/areas-de-logistica.test.ts`).
export const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

// `declaraciones_listar` no declara valores por omisión y sus tipos generados no admiten nulo; la base sí (un cursor nulo es «desde el principio»).
export function nuloParaLaBase(valor: string | null): string {
  return valor as string
}
