import 'server-only'
import { ok, type Resultado } from '@/shared/lib/errores'
import type { ValoresDeFiltros } from '@/shared/lib/filtros'
import type { Permisos } from '@/shared/lib/permisos'
import { leerCarteraCorta } from '../../composicion'
import type { CampoDeLead } from '../../entities/campo'
import type { TipoDeLeadEnCatalogo } from '../../entities/catalogos'
import { condicionesDeLeads, type CondicionDeLead } from '../../entities/filtros'
import { leerMiosDeLaCartera, pideLaCartera } from '../../entities/fuente-del-listado'
import { idsDelNumeroBuscado } from './ids-del-numero'

// Lo que el listado y la exportación necesitan para armar las condiciones de lo que la persona filtró: el lead que tiene el número buscado y de dónde se lee
// «míos». Quien ve sólo lo propio lo lee de su cartera (`fuenteDelListado`): cuesta lo que pesa, no cuántos leads hay. Quien ve «todos» también, si su cartera
// es corta (5a-5: una supervisora con 3 leads propios, de 82 a 5 ms con 212.000 leads); se le pregunta a la base sólo si va a leer «míos» (o filtra por un
// campo privado, que lo vuelve «míos»), en paralelo con el número. Devuelve la función que arma las condiciones de unos filtros: el listado la usa también para
// los tachados ocultos, con los mismos números y la misma cartera.
export async function condicionesDeLaPersona(entrada: {
  campos: readonly CampoDeLead[]
  valores: ValoresDeFiltros
  permisos: Permisos
  zona: string
  tipos: readonly TipoDeLeadEnCatalogo[]
  soloMios: boolean
  puedeVerTodos: boolean
}): Promise<Resultado<(aplicados: ValoresDeFiltros) => CondicionDeLead[]>> {
  const { campos, valores, permisos, zona, tipos, soloMios, puedeVerTodos } = entrada
  const preguntaPorLaCartera =
    puedeVerTodos && pideLaCartera(condicionesDeLeads(campos, valores, { zona, soloMios, tipos }))
  const [ids, carteraCorta] = await Promise.all([
    idsDelNumeroBuscado(valores, permisos),
    preguntaPorLaCartera ? leerCarteraCorta() : false,
  ])
  if (!ids.ok) {
    return ids
  }
  const opciones = {
    zona,
    soloMios,
    desdeLaCartera: !puedeVerTodos,
    idsDelNumero: ids.data,
    tipos,
  }
  return ok((aplicados) => {
    const condiciones = condicionesDeLeads(campos, aplicados, opciones)
    return carteraCorta ? leerMiosDeLaCartera(condiciones) : condiciones
  })
}
