// Guardar el transporte de una unidad, dicho como interfaz (6.08-2). La implementación (Supabase, por `transporte_guardar`, con la versión) vive en `infra/transporte/guardar.ts` y se la
// entrega `areas/transporte/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { CambiosDelGrupo } from './edicion-del-grupo'
import type { CambiosDeTransporte } from './transporte'

export type PedidoDeTransporte = {
  // El vehículo (el repuesto llega con 8.13).
  vehiculoId: string
  // La versión leída; nula = crear (si ya existía, la base dice `PT409`).
  actualizadoEnEsperado: string | null
  cambios: CambiosDeTransporte
}

export type TransporteGuardado = { id: string; actualizadoEn: string; sinCambios: boolean }

// «Editar grupo» (6.08-4): lo mismo para todas las unidades de un embarque o contenedor, todo o nada, con la versión de cada transporte que vio el resumen.
export type PedidoDelGrupo = {
  tipo: 'booking' | 'contenedor'
  clave: string
  // transporte id → `actualizado_en` que se leyó.
  esperadas: Record<string, string>
  cambios: CambiosDelGrupo
}

// `clave` es la que devuelve la base: nueva si el cambio tocó el contenedor o el booking del tipo.
export type GrupoAplicado = { tipo: 'booking' | 'contenedor'; clave: string; sinCambios: boolean }

export type RepositorioDeTransporte = {
  guardar: (pedido: PedidoDeTransporte) => Promise<ResultadoDeAccion<TransporteGuardado>>
  aplicarAlGrupo: (pedido: PedidoDelGrupo) => Promise<ResultadoDeAccion<GrupoAplicado>>
}
