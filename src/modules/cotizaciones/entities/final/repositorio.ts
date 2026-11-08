// Lo que el área `final` necesita de afuera, dicho como interfaz (4.25-2). La implementación (Supabase) vive en `infra/final/` y se la entrega
// `areas/final/composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'

// Marcar final una cotización: la base mira todo (la clave del origen, el vehículo, el lead y su cartera, las preventas que no puede mandar a la papelera) y
// devuelve el motivo escrito para la persona. Sin versión esperada (P1 a del 4.25-2).
export type RepositorioDeFinal = {
  marcar: (cotizacionId: string) => Promise<Resultado<null>>
}
