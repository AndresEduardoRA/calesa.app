// Leer y crear proyectos, dicho como interfaz (8.09-1). La implementación (Supabase, `repuestos_proyectos_listar` y `repuesto_proyecto_crear`) vive en
// `infra/proyectos/` y se la entrega `areas/proyectos/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { Resultado } from '@/shared/lib/errores'
import type { PaginaDeProyectos, PedidoDelListado } from './listado'

// Lo que acepta `repuesto_proyecto_crear` en `p_datos` y nada más (otra clave: 22023). Un campo vacío no se manda.
export type DatosDeProyecto = {
  vehiculoId?: string
  vehiculoEtiqueta?: string
  vin?: string
  leadId?: string
  clienteNombre?: string
  clienteTelefono?: string
  notas?: string
}

export type ProyectoCreado = { id: string; numero: number; actualizadoEn: string }

export type RepositorioDeProyectos = {
  // Una página del listado (la base devuelve `tamano + 1`); sin `repuestos.ver` es vacía.
  listar: (pedido: PedidoDelListado) => Promise<Resultado<PaginaDeProyectos>>
  // Idempotente por `id` (lo genera el formulario al abrirse).
  crear: (pedido: {
    id: string
    datos: DatosDeProyecto
  }) => Promise<ResultadoDeAccion<ProyectoCreado>>
}
