// Un mutador del corpus diferencial que NO rompe nada: agrega un `texto` válido a una `constante` o a un `calculo`, como lo guarda el
// editor. Sirve para que los defectos mezclados convivan con él: un `texto` bueno no tapa ni cambia el primer rechazo, ni lo inventa.
// Los defectos del `texto` (vacío, largo, que no es texto, en otro tipo) son de forma: `mutadores-de-forma.ts`, F70 y F04.
import { elegir, esTipo, idDe, nodosDe, type Mutador } from './mutadores-de-formula'

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
]
