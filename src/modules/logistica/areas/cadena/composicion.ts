// Composición de el área `cadena` de `logistica` en el servidor (6.03-1): une la lectura (`infra/cadena`) con el nombre de las tarjetas (`features/cadena`). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import type { FiltrosDeLaCadena } from '../../entities/cadena/filtros'
import type {
  CadenaLeida,
  PaginaDeLaColumna,
  ResultadoDeDondeEsta,
  TarjetaDeLaCadena,
} from '../../entities/cadena/leer'
import type { PedidoDeLaColumna } from '../../entities/cadena/repositorios'
import { dondeEstaDe } from '../../features/cadena/donde-esta'
import { nombrarLasTarjetas } from '../../features/cadena/identidad'
import {
  origenesDeLaCadena,
  type OrigenesDeLaCadena,
} from '../../features/cadena/origenes-de-la-cadena'
import { leerAtributosDeLaBase } from '../../infra/cadena/atributos'
import { leerCadenaDeLaBase, leerColumnaDeLaBase } from '../../infra/cadena/cadena'
import { leerDondeEstaDeLaBase } from '../../infra/cadena/donde-esta'
import { leerNavieras } from '../../infra/cadena/navieras'

export { leerNavieras }

// La cadena del origen, primera página de cada columna, con las tarjetas nombradas por el campo principal del origen (6.13). Los nombres se piden una vez para todas las columnas.
export async function leerCadena(
  origenId: string,
  filtros: FiltrosDeLaCadena,
): Promise<Resultado<CadenaLeida>> {
  const leida = await leerCadenaDeLaBase(origenId, filtros)
  if (!leida.ok) return leida
  const nombradas = await nombrarLasTarjetas(
    origenId,
    leida.data.columnas.flatMap((columna) => columna.tarjetas),
    leerAtributosDeLaBase,
  )
  const porId = new Map<string, TarjetaDeLaCadena>(nombradas.map((t) => [t.id, t]))
  return {
    ok: true,
    data: {
      columnas: leida.data.columnas.map((columna) => ({
        ...columna,
        tarjetas: columna.tarjetas.map((t) => porId.get(t.id) ?? t),
      })),
    },
  }
}

// Lo que sigue de una columna («Ver más»), también con las tarjetas nombradas.
export async function leerMasDeLaColumna(
  pedido: PedidoDeLaColumna,
): Promise<Resultado<PaginaDeLaColumna>> {
  const leida = await leerColumnaDeLaBase(pedido)
  if (!leida.ok) return leida
  const tarjetas = await nombrarLasTarjetas(
    pedido.origenId,
    leida.data.tarjetas,
    leerAtributosDeLaBase,
  )
  return { ok: true, data: { tarjetas, hayMas: leida.data.hayMas } }
}

// «Dónde está» lo que se busca, en todos los orígenes de la persona. Un texto que no alcanza el mínimo no llama a la base.
export function dondeEsta(busqueda: string): Promise<Resultado<ResultadoDeDondeEsta>> {
  return dondeEstaDe(leerDondeEstaDeLaBase, busqueda)
}

// Las pestañas de origen. Nulo si no se pudo leer la lista de orígenes.
export function leerOrigenesDeLaCadena(permisos: Permisos): Promise<OrigenesDeLaCadena | null> {
  return origenesDeLaCadena(permisos)
}
