import { conteoAcotado, type ConteoAcotado } from '@/shared/lib/conteo'
import { ok, type Resultado } from '@/shared/lib/errores'
import type { Cursor } from '@/shared/lib/paginacion'
import {
  condicionesDeLaPagina,
  filtrosDeCandidatos,
  ventanasHasta,
  type Candidatos,
  type FiltrosDeCandidatos,
} from '../../entities/candidatos'
import type { CondicionDeLead } from '../../entities/filtros'

// Una ventana de candidatos (`leads_candidatos()`).
export type LectorDeVentana = (filtros: FiltrosDeCandidatos) => Promise<Resultado<Candidatos>>
// Cuántos de esos candidatos cumplen lo que la página sigue aplicando (las marcas, «míos»…), hasta `limite`.
export type ContadorDeCandidatos = (
  ids: readonly string[],
  condiciones: readonly CondicionDeLead[],
  limite: number,
) => Promise<Resultado<number>>

// Cuántos leads cumplen las condiciones, **hasta `tope`**, por la ventana de candidatos en vez de la vista (4.03, 5a-34): cada ventana trae los que cumplen el campo privado y
// los tachados de quien cuenta, y se cuentan de ellos los que cumplen lo demás. Lo mismo que el conteo por la vista (los candidatos son exactamente los que cumplen lo que la
// página no repite), sin pagar `atributos_lead()` por lead. Nulo = volver a la vista: se agotaron las ventanas que alcanzan para `tope + 1`, o la base no dijo dónde seguir.
export async function contarPorCandidatos(pedido: {
  condiciones: readonly CondicionDeLead[]
  tope: number
  leerVentana: LectorDeVentana
  contarCandidatos: ContadorDeCandidatos
}): Promise<Resultado<ConteoAcotado> | null> {
  const { condiciones, tope, leerVentana, contarCandidatos } = pedido
  // Un conteo no tiene tope de recorrido: los campos públicos los lee la página, completos.
  const deLaPagina = condicionesDeLaPagina(condiciones, false)
  let desde: Cursor | null = null
  let contados = 0
  for (let ventana = 0; ventana < ventanasHasta(tope); ventana++) {
    const candidatos = await leerVentana(
      filtrosDeCandidatos(condiciones, desde, 'siguiente', false),
    )
    if (!candidatos.ok) {
      return candidatos
    }
    if (candidatos.data.ids.length > 0) {
      const cuantos = await contarCandidatos(candidatos.data.ids, deLaPagina, tope + 1 - contados)
      if (!cuantos.ok) {
        return cuantos
      }
      contados += cuantos.data
    }
    const { hasta } = candidatos.data
    if (contados > tope || candidatos.data.completa) {
      return ok(conteoAcotado(contados, tope))
    }
    if (hasta === null) {
      return null
    }
    desde = { instante: hasta.creado_en, id: hasta.id, sentido: 'siguiente' }
  }
  return null
}
