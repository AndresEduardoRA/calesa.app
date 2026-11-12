// Los puertos y las navieras de Configuración › Logística, leídos desde el navegador (6.08-1): todos, también los desactivados, y sin recordar nada (la lista se relee tras cada escritura).
// Son catálogos de la empresa (decenas de filas): `.limit(201)` y `cortarAlTope` a 200, con `<AvisoDeTope>` si había más. Índices: `puertos_pkey` y `navieras_pkey` (tablas de decenas de filas).
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  navierasDesde,
  ordenarNavieras,
  ordenarPuertos,
  puertosDesde,
  TOPE_DE_CATALOGO_DE_TRANSPORTE,
  type NavieraDeCatalogo,
  type PuertoDeCatalogo,
} from '../../entities/transporte/catalogo'

export const NO_SE_CARGARON_LOS_PUERTOS = 'No se pudieron cargar los puertos.'
export const NO_SE_CARGARON_LAS_NAVIERAS = 'No se pudieron cargar las navieras.'

export type CatalogoLeido<T> = { filas: T[]; hayMas: boolean }

export async function leerPuertosDeConfiguracion(): Promise<
  Resultado<CatalogoLeido<PuertoDeCatalogo>>
> {
  const { data, error } = await createClient()
    .from('puertos')
    .select('id, nombre, pais, codigo, activo, orden')
    .order('orden')
    .order('nombre')
    .limit(TOPE_DE_CATALOGO_DE_TRANSPORTE + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lista = puertosDesde(data)
  if (lista === null) {
    return fallo('inesperado', NO_SE_CARGARON_LOS_PUERTOS)
  }
  const { filas, hayMas } = cortarAlTope(lista, TOPE_DE_CATALOGO_DE_TRANSPORTE)
  return ok({ filas: ordenarPuertos(filas), hayMas })
}

export async function leerNavierasDeConfiguracion(): Promise<
  Resultado<CatalogoLeido<NavieraDeCatalogo>>
> {
  const { data, error } = await createClient()
    .from('navieras')
    .select('id, nombre, activo')
    .order('nombre')
    .limit(TOPE_DE_CATALOGO_DE_TRANSPORTE + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lista = navierasDesde(data)
  if (lista === null) {
    return fallo('inesperado', NO_SE_CARGARON_LAS_NAVIERAS)
  }
  const { filas, hayMas } = cortarAlTope(lista, TOPE_DE_CATALOGO_DE_TRANSPORTE)
  return ok({ filas: ordenarNavieras(filas), hayMas })
}
