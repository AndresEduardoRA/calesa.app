// Lo que `features/` necesita de la base, como interfaces: las implementa `infra/` y las une `composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { TipoDelBuscador } from './resultados'

export type RepositorioDeVisitas = {
  // Pone (o renueva) la visita de quien mira; la persona sale de la sesión dentro de la RPC.
  registrar(tipo: TipoDelBuscador, id: string): Promise<Resultado<null>>
}
