// Crear, guardar, eliminar y mover las preguntas frecuentes, dicho como interfaz (8.02-1). La implementación (Supabase, escritura directa bajo la RLS de
// `web.contenido.gestionar`) vive en `infra/contenido/faqs.ts` y se la entrega `areas/contenido/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { DatosDeFaq, Faq } from './faqs'

export type RepositorioDeFaqs = {
  // La pregunta nace al final: `orden` = el máximo de las leídas + 1.
  crear: (datos: DatosDeFaq) => Promise<ResultadoDeAccion<Faq>>
  // `cambios` es sólo lo que cambió. 0 filas nunca es éxito: conflicto, ya no existe o sin permiso.
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: Partial<DatosDeFaq>
  }) => Promise<ResultadoDeAccion<Faq>>
  eliminar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeAccion<{ id: string }>>
  // Relee la lista, calcula `reordenar()` y escribe cada fila con su versión. No es atómico (D6).
  mover: (pedido: { id: string; direccion: 'subir' | 'bajar' }) => Promise<ResultadoDeAccion<null>>
}
