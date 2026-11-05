import type { Cursor } from '@/shared/lib/paginacion'
import type { Database } from '@/shared/types/database.types'

// El máximo de filas por página del listado `/cotizaciones` (el selector ofrece hasta acá): medido con 250.000 cotizaciones en
// `supabase/tests/medir-cotizaciones-listado.sql` (`docs/RENDIMIENTO.md`). `cotizaciones_listado()` lo escribe igual en su `_acotar_pagina`.
export const MAXIMO_DE_PAGINA_DE_COTIZACIONES = 100

export type ClaseDeCotizacion = Database['public']['Enums']['clase_cotizacion']
export type EstadoDeCotizacion = Database['public']['Enums']['estado_cotizacion']

// Lo que pide una página del listado: cada filtro achica lo que quien mira ve (la RLS decide). «Mías» son las que creó quien mira (P1 del 4.16-1).
export type PedidoDelListado = {
  origenId?: string
  clase?: ClaseDeCotizacion
  mias?: boolean
  // Las de un vehículo: el camino a lo antiguo del historial del vehículo, tras sus 500.
  vehiculoId?: string
  cursor: Cursor | null
  tamano: number
}

// Una fila del listado, sin el snapshot. Los nombres del lead, del vehículo y del autor los lee la pantalla sobre la página.
export type FilaDelListado = {
  id: string
  numero: number
  origenId: string
  leadId: string | null
  vehiculoId: string | null
  creadoPor: string
  clase: ClaseDeCotizacion
  estado: EstadoDeCotizacion
  titulo: string | null
  totalBase: number
  monedaMostrar: string | null
  // El texto de la base, con sus microsegundos: es lo que lleva el cursor.
  creadoEn: string
  // La fecha (AAAA-MM-DD) hasta la que vale, por día en la zona de la empresa; `vencida` si ya pasó.
  venceEl: string
  vencida: boolean
}
