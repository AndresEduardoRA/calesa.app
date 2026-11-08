// El aviso «se deduce restando» (4.22, sin bloquear): una suma que se ve y de la que sólo un sumando directo queda oculto para quien
// no tiene un nivel. Quien ve la suma y los demás sumandos saca el oculto restando. Es un aviso, no una garantía: la base nunca deja de
// enviar el total. Límites dichos: sólo la suma directa (`op: 'suma'`); no sigue cadenas (una suma de sumas), ni `restar`, ni `porcentaje_de`.
// La frase y dónde se muestra son del editor.
import { NIVEL_TODOS, type Diseno } from '../diseno'
import type { Definicion } from '../formula'
import { visibilidadDelDiseno, type VisibilidadDeNodo } from './visibilidad'

export type DeduccionDelDiseno = { suma: string; oculto: string; nivel: string }

// Los niveles restringidos con algún nodo, en el orden en que el diseño los nombra por primera vez.
function nivelesDe(visibilidad: Map<string, VisibilidadDeNodo>): string[] {
  const niveles = new Set<string>()
  for (const v of visibilidad.values()) if (v.ver !== NIVEL_TODOS) niveles.add(v.ver)
  return [...niveles]
}

export function deduccionesDelDiseno(definicion: Definicion, diseno: Diseno): DeduccionDelDiseno[] {
  const visibilidad = visibilidadDelDiseno(definicion, diseno)
  const niveles = nivelesDe(visibilidad)
  const avisos: DeduccionDelDiseno[] = []
  for (const nodo of definicion.nodos) {
    if (nodo.tipo !== 'calculo' || nodo.op !== 'suma') continue
    const propia = visibilidad.get(nodo.id)
    if (propia === undefined) continue
    const sumandos = [...new Set(nodo.de)]
    for (const nivel of niveles) {
      if (propia.ver === nivel) continue
      // Oculto para quien no tiene `nivel`: lo del nivel y lo que no viaja a nadie (sin dibujar).
      const ocultos = sumandos.filter((id) => (visibilidad.get(id)?.ver ?? nivel) === nivel)
      const unico = ocultos[0]
      if (ocultos.length === 1 && unico !== undefined && visibilidad.has(unico)) {
        avisos.push({ suma: nodo.id, oculto: unico, nivel })
      }
    }
  }
  return avisos
}
