// Buscar vehículos para sumar a una declaración (6.09-2, D4): `logistica_donde_esta()` por título, VIN o lote (mínimo 3 letras o dígitos, hasta 10), sólo en los orígenes con la regla
// `logistica` que la persona ve. Se lee con el navegador y la sesión de quien mira; un texto corto no llama a la base.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { cumpleElMinimo } from '@/shared/lib/filtros'
import { createClient } from '@/shared/lib/supabase/browser'
import { MINIMO_DE_BUSQUEDA_DE_ADUANA } from '../../entities/aduana/filtros'
import { unidadesBuscadasDesde, type UnidadBuscada } from '../../entities/aduana/unidad-buscada'

export const TOPE_DE_UNIDADES_BUSCADAS = 10
export const NO_SE_BUSCO = 'No se pudo buscar. Vuelve a intentar.'
const LARGO_MAXIMO = 100

export type UnidadesBuscadas = { unidades: UnidadBuscada[]; hayMas: boolean }

export async function buscarUnidades(texto: string): Promise<Resultado<UnidadesBuscadas>> {
  const buscar = texto.trim().slice(0, LARGO_MAXIMO)
  if (!cumpleElMinimo(buscar, MINIMO_DE_BUSQUEDA_DE_ADUANA)) {
    return ok({ unidades: [], hayMas: false })
  }
  const supabase = createClient()
  const { data, error } = await supabase.rpc('logistica_donde_esta', {
    p_buscar: buscar,
    p_tope: TOPE_DE_UNIDADES_BUSCADAS,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = unidadesBuscadasDesde(data)
  return leidas === null ? fallo('inesperado', NO_SE_BUSCO) : ok(leidas)
}
