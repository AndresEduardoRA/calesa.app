// Mutadores del corpus diferencial que NO rompen nada: agregan un `texto` válido a una `constante` o a un `calculo`, como lo guarda el
// editor. Sirven para que los defectos mezclados convivan con él: un `texto` bueno no tapa ni cambia el primer rechazo, ni lo inventa.
// Los defectos del `texto` (vacío, largo, que no es texto, en otro tipo) son de forma: `mutadores-de-forma.ts`, F70 y F04.
//
// `texto_de_1`, `_2` y `_3` ponen un texto de ese largo (el id recortado): el mínimo es 1, y sin ellos el más corto del corpus era
// `=<id>`, de 2 o más. Como cada mutador cruzado se aplica solo varias veces, cada largo queda en casos válidos.
import { elegir, esTipo, idDe, nodosDe, type Mutador } from './mutadores-de-formula'

function textoDeLargo(largo: number): Mutador {
  return {
    nombre: `texto_de_${String(largo)}`,
    aplicar: (f, azar) => {
      const yo = elegir(
        azar,
        nodosDe(
          f,
          (n) =>
            esTipo('constante', 'calculo')(n) &&
            n['texto'] === undefined &&
            idDe(n).length >= largo,
        ),
      )
      if (!yo) return null
      yo.n['texto'] = idDe(yo.n).slice(0, largo)
      return `texto_de_${String(largo)}(${idDe(yo.n)})`
    },
  }
}

export const MUTADORES_DE_TEXTO: readonly Mutador[] = [
  {
    nombre: 'texto_valido',
    aplicar: (f, azar) => {
      const yo = elegir(
        azar,
        nodosDe(f, (n) => esTipo('constante', 'calculo')(n) && n['texto'] === undefined),
      )
      if (!yo) return null
      yo.n['texto'] = `=${idDe(yo.n)}`
      return `texto_valido(${idDe(yo.n)})`
    },
  },
  textoDeLargo(1),
  textoDeLargo(2),
  textoDeLargo(3),
]
