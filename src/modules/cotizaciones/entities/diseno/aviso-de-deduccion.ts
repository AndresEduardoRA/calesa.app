// La frase del aviso «se deduce restando» (4.22-2, sin bloquear): lo que `deduccionesDelDiseno()` encuentra, dicho con las etiquetas de la fórmula y los
// nombres de los niveles. Desde 4 avisos se dicen 3 y «Y N más.» para que la pantalla no se llene.
import type { DeduccionDelDiseno } from './deduccion'

export const AVISOS_VISIBLES = 3

type Nombres = { nodos: ReadonlyMap<string, string>; niveles: ReadonlyMap<string, string> }

const nombre = (mapa: ReadonlyMap<string, string>, clave: string) => mapa.get(clave) ?? clave

export function textoDeDeduccion(d: DeduccionDelDiseno, nombres: Nombres): string {
  return `Quien no tiene el nivel «${nombre(nombres.niveles, d.nivel)}» puede deducir «${nombre(nombres.nodos, d.oculto)}» restando: ve «${nombre(nombres.nodos, d.suma)}» y los demás sumandos.`
}

export function avisosDeDeduccion(
  deducciones: readonly DeduccionDelDiseno[],
  nombres: Nombres,
): string[] {
  if (deducciones.length <= AVISOS_VISIBLES) {
    return deducciones.map((d) => textoDeDeduccion(d, nombres))
  }
  const dichas = deducciones.slice(0, AVISOS_VISIBLES).map((d) => textoDeDeduccion(d, nombres))
  return [...dichas, `Y ${deducciones.length - AVISOS_VISIBLES} más.`]
}
