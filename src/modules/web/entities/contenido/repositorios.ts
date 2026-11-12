// Crear, guardar, eliminar y mover las preguntas frecuentes, dicho como interfaz (8.02-1). La implementación (Supabase, escritura directa bajo la RLS de
// `web.contenido.gestionar`) vive en `infra/contenido/faqs.ts` y se la entrega `areas/contenido/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { DatosDeFaq, Faq } from './faqs'
import type { Testimonio } from './testimonios'
import type { DatosDeTestimonio } from './testimonios-formulario'

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

// Crear, guardar y eliminar un testimonio (escritura directa bajo la RLS de `web.contenido.gestionar`, 8.02-2).
export type RepositorioDeTestimonios = {
  // El testimonio nace al final (`orden` = el máximo de los leídos + 1), sin publicar y sin consentimiento.
  crear: (datos: DatosDeTestimonio) => Promise<ResultadoDeAccion<Testimonio>>
  // `cambios` es sólo lo que cambió. 0 filas nunca es éxito: conflicto, ya no existe o sin permiso.
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: Partial<DatosDeTestimonio>
  }) => Promise<ResultadoDeAccion<Testimonio>>
  eliminar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeAccion<{ id: string }>>
}

// Registrar y retirar el consentimiento: por las RPC `web_testimonio_consentir` y `web_testimonio_retirar` (`consent_*` no se escribe directo).
export type RepositorioDeConsentimiento = {
  consentir: (pedido: {
    id: string
    actualizadoEnEsperado: string
    canal: string
    ciudad: boolean
    vehiculo: boolean
    foto: boolean
  }) => Promise<ResultadoDeAccion<{ actualizadoEn: string }>>
  retirar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeAccion<{ actualizadoEn: string }>>
}
