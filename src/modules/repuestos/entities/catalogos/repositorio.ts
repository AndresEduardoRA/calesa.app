// Crear, guardar y borrar un valor de catálogo, dicho como interfaz (8.08-2). La implementación (Supabase, escritura directa bajo la RLS de
// `repuestos.configurar`) vive en `infra/catalogos/escribir.ts` y se la entrega `areas/catalogos/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { ClaveDeCatalogo, DatosDeValor, ValorDeCatalogo } from './catalogo'

export type RepositorioDeValores = {
  crear: (
    datos: DatosDeValor & { catalogo: ClaveDeCatalogo },
  ) => Promise<ResultadoDeAccion<ValorDeCatalogo>>
  // `cambios` es sólo lo que cambió (`cambiosDeValor`); nunca el catálogo (H1). `nombre` es el que se ve, para hablar de él en un error.
  guardar: (pedido: {
    id: string
    nombre: string
    cambios: Partial<DatosDeValor>
  }) => Promise<ResultadoDeAccion<ValorDeCatalogo>>
  // Un valor en uso no se borra: el trigger responde 23514 con hint `en_uso` y se dice que se desactive.
  eliminar: (pedido: { id: string; nombre: string }) => Promise<ResultadoDeAccion<{ id: string }>>
}
