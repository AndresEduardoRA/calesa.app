import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  TOPE_DE_LA_OFERTA,
  catalogoDesde,
  ofertaDesde,
  type ElementoDeOferta,
} from '../../entities/reglas/oferta'
import type {
  LectorDeCatalogoDeTransporte,
  LectorDeOferta,
} from '../../entities/reglas/repositorios'

const NO_SE_LEYO = 'No pudimos leer la oferta de transporte. Vuelve a intentar.'

// La oferta guardada de un flujo (`flujo_oferta()`, 5.10): las listas vacías son «se ofrece todo». Leer es de cualquier cuenta con sesión.
export const leerOfertaDeTransporte: LectorDeOferta = cache(async (flujoId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('flujo_oferta', { p_flujo: flujoId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const oferta = ofertaDesde(data)
  return oferta ? ok(oferta) : fallo('inesperado', NO_SE_LEYO)
})

// Los puertos y navieras activos, para marcarlos. Son catálogos de decenas de filas (puertos_pkey, navieras_pkey: no hay filtro por índice que
// importe), con `tope + 1` leídas para decir si hay más. Se cargan en Logística (Fase 6); acá sólo se leen.
export const leerCatalogoDeTransporte: LectorDeCatalogoDeTransporte = cache(async () => {
  const supabase = await createClient()
  const [puertos, navieras] = await Promise.all([
    supabase
      .from('puertos')
      .select('id, nombre, activo')
      .eq('activo', true)
      .order('orden')
      .order('nombre')
      .limit(TOPE_DE_LA_OFERTA + 1),
    supabase
      .from('navieras')
      .select('id, nombre, activo')
      .eq('activo', true)
      .order('nombre')
      .limit(TOPE_DE_LA_OFERTA + 1),
  ])
  const error = puertos.error ?? navieras.error
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const comoElementos = (filas: readonly ElementoDeOferta[]) =>
    filas.map(({ id, nombre, activo }) => ({ id, nombre, activo }))
  return ok(catalogoDesde(comoElementos(puertos.data ?? []), comoElementos(navieras.data ?? [])))
})
