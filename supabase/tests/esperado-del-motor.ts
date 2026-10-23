// Lo que dice el motor de TS de una llamada a `evaluar_formula()` (paso 4.06): el esperado del corpus diferencial. La llamada
// pasa por lo mismo que pasa quien llama a `evaluar()`: la forma de la entrada (`esquemaEntrada`), la del modo
// (`esquemaModoDeCambio`) y la de la fórmula (`esquemaFormula`); un rechazo de la forma es `entrada_invalida` o `modo_invalido`
// con el primer campo que falla en `donde`, como la base. Lo que lanza el motor es un error de llamada; el resto, el resultado.
import { esquemaFormula, esquemaModoDeCambio } from '@/modules/cotizaciones/entities/formula'
import { evaluar, type Resultado } from '@/modules/cotizaciones/entities/motor'
import { esquemaEntrada } from '@/modules/cotizaciones/entities/motor-entrada'
import { ErrorDelMotor } from '@/modules/cotizaciones/entities/motor-errores'

export type Esperado = { resultado: Resultado } | { error: { codigo: string; donde?: string } }

// La llamada, como la recibe la base: la fórmula en sus dos columnas, la entrada y el modo (ya parseados de JSON).
export type Llamada = { definicion: unknown; params: unknown; entrada: unknown; modo?: unknown }

// `z.ZodError` → el primer campo del primer problema (undefined si el problema no es de un campo).
function primerCampo(error: {
  issues: readonly { path: readonly PropertyKey[] }[]
}): string | undefined {
  const campo = error.issues[0]?.path[0]
  return typeof campo === 'string' ? campo : undefined
}

const conDonde = (codigo: string, donde: string | undefined) =>
  ({ error: donde === undefined ? { codigo } : { codigo, donde } }) as const

export function esperadoDe(llamada: Llamada): Esperado {
  const entrada = esquemaEntrada.safeParse(llamada.entrada)
  if (!entrada.success) return conDonde('entrada_invalida', primerCampo(entrada.error))
  const modo = llamada.modo === undefined ? undefined : esquemaModoDeCambio.safeParse(llamada.modo)
  if (modo && !modo.success) return conDonde('modo_invalido', primerCampo(modo.error))
  const formula = esquemaFormula.parse({ definicion: llamada.definicion, params: llamada.params })
  try {
    return { resultado: evaluar(formula, entrada.data, modo?.data) }
  } catch (e) {
    if (e instanceof ErrorDelMotor) return conDonde(e.codigo, e.donde)
    throw e
  }
}
