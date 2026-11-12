// Crear, corregir y eliminar una categoría de gasto, dicho como interfaz (6.11-4). La implementación (Supabase, escritura directa bajo la RLS de `logistica.catalogos.gestionar`) vive en
// `infra/dinero/categorias.ts` y se la entrega `areas/dinero/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { CategoriaDeGasto, DatosDeCategoria } from './categoria'

export type RepositorioDeCategorias = {
  crear: (datos: DatosDeCategoria) => Promise<ResultadoDeAccion<CategoriaDeGasto>>
  // `cambios` es sólo lo que cambió (`cambiosDeCategoria`); `nombre` es el que se ve, para decir de cuál se habla en un error.
  guardar: (pedido: {
    id: string
    nombre: string
    cambios: Partial<DatosDeCategoria>
  }) => Promise<ResultadoDeAccion<CategoriaDeGasto>>
  // La base no borra una categoría con gastos (`on delete restrict`): responde 23503 y se dice que se desactive.
  eliminar: (pedido: { id: string; nombre: string }) => Promise<ResultadoDeAccion<{ id: string }>>
}
