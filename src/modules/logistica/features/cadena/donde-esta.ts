import { cumpleElMinimo } from '@/shared/lib/filtros'
import { ok, type Resultado } from '@/shared/lib/errores'
import { MINIMO_DE_BUSQUEDA_DE_LA_CADENA } from '../../entities/cadena/filtros'
import type { ResultadoDeDondeEsta } from '../../entities/cadena/leer'
import type { LectorDeDondeEsta } from '../../entities/cadena/repositorios'

const LARGO_MAXIMO = 100

/**
 * «Dónde está» de lo que se busca. Un texto que no alcanza el mínimo no llama a la base (devolvería vacío igual: recorrer los orígenes por nada es trabajo perdido); uno largo se
 * recorta a lo que acepta la RPC.
 */
export async function dondeEstaDe(
  lector: LectorDeDondeEsta,
  busqueda: string,
): Promise<Resultado<ResultadoDeDondeEsta>> {
  const texto = busqueda.trim().slice(0, LARGO_MAXIMO)
  if (!cumpleElMinimo(texto, MINIMO_DE_BUSQUEDA_DE_LA_CADENA)) {
    return ok({ unidades: [], hayMas: false })
  }
  return lector(texto)
}
