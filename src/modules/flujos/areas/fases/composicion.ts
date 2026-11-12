// Composición del área `fases` de `flujos` en el servidor (5.02, la llena el 5.04): une las interfaces de `entities/fases/` con su implementación
// de `infra/fases/`. Sale por la `composicion.ts` de la raíz; la usan las actions de `features/fases/`.
import 'server-only'
import type { LectorDeImpactoDeFase, RepositorioDeFases } from '../../entities/fases/repositorios'
import { fasesSupabase } from '../../infra/fases/escribir-fases'
import { leerImpactoDeFaseSupabase } from '../../infra/fases/leer-impacto'

// Lo que usa una fase y qué haría eliminarla; sólo para quien configura el flujo.
export const leerImpactoDeFase: LectorDeImpactoDeFase = leerImpactoDeFaseSupabase

export const repositorioDeFases: RepositorioDeFases = fasesSupabase
