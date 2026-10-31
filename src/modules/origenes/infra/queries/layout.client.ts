// El layout activo de un origen, leído desde el navegador con la sesión de quien mira: lo que pide el alta de un vehículo dentro del panel del vehículo de la hoja de
// cotizar al abrirse. Va por el navegador y no por la página porque la hoja no tiene que cargar el layout (un origen de subasta tiene 106 campos, ≈ 69 KB sin comprimir en
// su documento) en cada apertura, se abra o no el alta. Cualquier cuenta lee el layout (como `getLayout`); sólo los activos: el alta no usa los apagados.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { camposDesde, type CampoDeLayout } from '../../entities/campo'
import { categoriasDesde, type Categoria } from '../../entities/categoria'

export type LayoutActivo = { campos: CampoDeLayout[]; categorias: Categoria[] }

export async function leerLayoutActivo(origenId: string): Promise<Resultado<LayoutActivo>> {
  const supabase = createClient()
  const [campos, categorias] = await Promise.all([
    supabase.from('origenes_campos').select('*').eq('origen_id', origenId).eq('activo', true),
    supabase.from('categorias').select('*').eq('origen_id', origenId).eq('activa', true),
  ])
  if (campos.error) {
    return { ok: false, error: errorDePostgrest(campos.error) }
  }
  if (categorias.error) {
    return { ok: false, error: errorDePostgrest(categorias.error) }
  }
  try {
    return ok({
      campos: camposDesde(campos.data),
      categorias: categoriasDesde(categorias.data, null),
    })
  } catch {
    return fallo('inesperado', 'No se pudo leer el formulario del origen.')
  }
}
