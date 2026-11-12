// Leer, crear, cerrar y reabrir proyectos, dicho como interfaz (8.09-1 y 8.09-2). La implementación (Supabase, `repuestos_proyectos_listar` y `repuesto_proyecto_crear`) vive en
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

// Lo que devuelven cerrar y reabrir: la versión nueva (para deshacer) y si quedó cerrado.
export type CierreDeProyecto = { id: string; actualizadoEn: string; cerradoEn: string | null }

export type PedidoDeCierre = { id: string; actualizadoEn: string }

export type RepositorioDeProyectos = {
  // Una página del listado (la base devuelve `tamano + 1`); sin `repuestos.ver` es vacía.
  listar: (pedido: PedidoDelListado) => Promise<Resultado<PaginaDeProyectos>>
  // Idempotente por `id` (lo genera el formulario al abrirse).
  crear: (pedido: {
    id: string
    datos: DatosDeProyecto
  }) => Promise<ResultadoDeAccion<ProyectoCreado>>
  // Con la versión que se vio (`PT409` si otra persona lo cambió); uno ya cerrado (o ya abierto) es 23514 con su texto.
  cerrar: (pedido: PedidoDeCierre) => Promise<ResultadoDeAccion<CierreDeProyecto>>
  reabrir: (pedido: PedidoDeCierre) => Promise<ResultadoDeAccion<CierreDeProyecto>>
}
