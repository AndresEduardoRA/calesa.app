// La plantilla de la tarjeta validada como la valida la base: espejo de `validar_plantilla()` (20261106185900_plantilla_validar.sql:136-164; 4.19-2), con el juego
// común `casos-de-plantilla.json`. Es una ayuda al tipear (4.19-3): la base vuelve a validar al guardar y al publicar. Mismo orden, misma regla, mismo `donde`
// y el mismo mensaje; nunca lanza. Sin contexto (la base con `p_def` nulo) valida sólo la forma; sin `tonos`, no mira el catálogo.
import { formaDePlantilla, type Plantilla } from './forma-de-plantilla'
import { rechazoDePlantilla, type RechazoDePlantilla } from './motivos-de-plantilla'
import { revisarNodosDePlantilla, type ContextoDeNodos } from './nodos-de-plantilla'
import { tonosQueYaNoEstan } from './tonos-que-ya-no-estan'

export type ContextoDePlantilla = ContextoDeNodos & { readonly tonos: readonly string[] | null }

export type ResultadoDeValidacionDePlantilla =
  { ok: true; plantilla: Plantilla } | { ok: false; error: RechazoDePlantilla }

// Los grupos: todos los de la fórmula, una vez cada uno, y (con el catálogo) cada tono elegido en él.
function revisarGrupos(
  plantilla: Plantilla,
  contexto: ContextoDePlantilla,
): RechazoDePlantilla | null {
  const deLaFormula = (contexto.definicion.grupos ?? []).map((g) => g.id)
  const existentes = new Set(deLaFormula)
  const nombrados = plantilla.grupos.map((g) => g.grupo)
  const inexistente = nombrados.find((g) => !existentes.has(g))
  if (inexistente !== undefined) return rechazoDePlantilla('grupo_inexistente', inexistente)
  const repetido = nombrados.find((g, i) => nombrados.indexOf(g) < i)
  if (repetido !== undefined) return rechazoDePlantilla('grupo_repetido', repetido)
  const enLaPlantilla = new Set(nombrados)
  const faltante = deLaFormula.find((g) => !enLaPlantilla.has(g))
  if (faltante !== undefined) return rechazoDePlantilla('grupo_faltante', faltante)
  if (contexto.tonos === null) return null
  const [sinTono] = tonosQueYaNoEstan(plantilla.grupos, contexto.tonos)
  return sinTono === undefined ? null : rechazoDePlantilla('tono_inexistente', sinTono.grupo)
}

export function validarPlantilla(
  entrada: unknown,
  contexto: ContextoDePlantilla | null,
): ResultadoDeValidacionDePlantilla {
  const forma = formaDePlantilla(entrada)
  if (!forma.ok || contexto === null) return forma
  const error =
    revisarGrupos(forma.plantilla, contexto) ?? revisarNodosDePlantilla(forma.plantilla, contexto)
  return error === null ? forma : { ok: false, error }
}
