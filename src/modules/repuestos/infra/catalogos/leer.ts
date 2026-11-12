import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  CATALOGOS_DE_REPUESTOS,
  TOPE_DE_VALORES_DE_CATALOGO,
  valoresDesde,
  type CatalogosDeRepuestos,
} from '../../entities/catalogos/catalogo'

export const COLUMNAS_DE_VALOR = 'id, catalogo, nombre, activo, orden'
const NO_SE_LEYO = 'No se pudieron cargar los catálogos.'

// Los cuatro catálogos de repuestos, con los desactivados (Configuración los muestra), ordenados y con tope (8.08-2). `repuestos_catalogos` es una
// tabla de configuración de decenas de filas: sin índice por `orden` ni medición (`escala.md`); filtra por el único `(catalogo, nombre)`. Leer es de
// cualquier cuenta con sesión (policy `true`).
export async function leerCatalogosDeRepuestos(): Promise<Resultado<CatalogosDeRepuestos>> {
  const supabase = await createClient()
  const respuestas = await Promise.all(
    CATALOGOS_DE_REPUESTOS.map(({ clave }) =>
      supabase
        .from('repuestos_catalogos')
        .select(COLUMNAS_DE_VALOR)
        .eq('catalogo', clave)
        .order('orden')
        .order('nombre')
        .limit(TOPE_DE_VALORES_DE_CATALOGO + 1),
    ),
  )
  const conError = respuestas.find((r) => r.error !== null)
  if (conError?.error) {
    return { ok: false, error: errorDePostgrest(conError.error) }
  }
  const catalogos: Partial<CatalogosDeRepuestos> = {}
  for (const [i, { clave }] of CATALOGOS_DE_REPUESTOS.entries()) {
    const valores = valoresDesde(respuestas[i]?.data)
    if (valores === null || valores.some((v) => v.catalogo !== clave)) {
      return fallo('inesperado', NO_SE_LEYO)
    }
    const { filas, hayMas } = cortarAlTope(valores, TOPE_DE_VALORES_DE_CATALOGO)
    catalogos[clave] = { valores: filas, hayMas }
  }
  return ok(catalogos as CatalogosDeRepuestos)
}
