// Lo que el área `aprobada` necesita de afuera, dicho como interfaz. La implementación (Supabase) vive en `infra/aprobada/` y se la entrega
// `areas/aprobada/composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { ResultadoDeAprobar } from './tipos'

// Aprobar una cotización: la base mira todo (ver, la clave del origen, el vehículo, el estado y la versión que se tenía en pantalla) y devuelve el motivo escrito
// para la persona.
export type RepositorioDeAprobada = {
  aprobar: (cotizacionId: string, actualizadoEn: string) => Promise<Resultado<ResultadoDeAprobar>>
}
