import 'server-only'
import { cache } from 'react'
import { cortarAlTope } from '@/shared/lib/conteo'
import {
  errorDePostgrest,
  fallo,
  MENSAJE_INESPERADO,
  ok,
  type Resultado,
} from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  navierasDesde,
  puertosDesde,
  TOPE_DE_CATALOGO_DE_TRANSPORTE,
  type NavieraDeCatalogo,
  type PuertoDeCatalogo,
} from '../../entities/transporte/catalogo'

// Las navieras y los puertos (todos, activos o no) para nombrar lo que dicen los grupos y para los filtros. Decenas de filas (`navieras_pkey`, `puertos_pkey`; policy `using (true)`), tope de
// 200 con una fila de más para saber si se cortó: no es una tabla que crece. Una sola lectura por pedido (`cache()`).
export type CatalogosDeTransporte = {
  navieras: NavieraDeCatalogo[]
  puertos: PuertoDeCatalogo[]
}

export const leerCatalogosDeTransporte = cache(
  async (): Promise<Resultado<CatalogosDeTransporte>> => {
    const supabase = await createClient()
    const [navieras, puertos] = await Promise.all([
      supabase
        .from('navieras')
        .select('id, nombre, activo')
        .order('nombre')
        .limit(TOPE_DE_CATALOGO_DE_TRANSPORTE + 1),
      supabase
        .from('puertos')
        .select('id, nombre, pais, codigo, activo, orden')
        .order('nombre')
        .limit(TOPE_DE_CATALOGO_DE_TRANSPORTE + 1),
    ])
    if (navieras.error) {
      return { ok: false, error: errorDePostgrest(navieras.error) }
    }
    if (puertos.error) {
      return { ok: false, error: errorDePostgrest(puertos.error) }
    }
    const leidasN = navierasDesde(navieras.data)
    const leidosP = puertosDesde(puertos.data)
    if (leidasN === null || leidosP === null) {
      return fallo('inesperado', MENSAJE_INESPERADO)
    }
    return ok({
      navieras: cortarAlTope(leidasN, TOPE_DE_CATALOGO_DE_TRANSPORTE).filas,
      puertos: cortarAlTope(leidosP, TOPE_DE_CATALOGO_DE_TRANSPORTE).filas,
    })
  },
)
