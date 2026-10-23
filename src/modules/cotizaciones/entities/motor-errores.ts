// Los errores de llamada del motor: lo que no es un dato que falta sino un error del código que llama (un modo
// que no corresponde a la fórmula, una entrada con claves de otro tipo, una fórmula que no pasó por
// validarFormula) o un rasgo que el motor todavía no evalúa. Lanzan: lo que puede causar una persona viaja como
// valor, en `faltantes` (docs/DECISIONES.md, 2026-10-23, paso 4.05 prompt 2).
import { buscar, recorrer, type Medidor } from './medidor'
import { sobrescribibleDe, type Nodo } from './nodos'

export const CODIGOS_DE_ERROR_DEL_MOTOR = [
  'rasgo_pendiente',
  'modo_invalido',
  'entrada_invalida',
  'formula_sin_validar',
] as const

export type CodigoDeErrorDelMotor = (typeof CODIGOS_DE_ERROR_DEL_MOTOR)[number]

export class ErrorDelMotor extends Error {
  readonly codigo: CodigoDeErrorDelMotor
  readonly donde: string | undefined

  constructor(codigo: CodigoDeErrorDelMotor, mensaje: string, donde?: string) {
    super(mensaje)
    this.name = 'ErrorDelMotor'
    this.codigo = codigo
    this.donde = donde
  }
}

// Lo que el motor del prompt 2 no evalúa. El prompt 3 de 4.05 implementa cada uno y saca su caso de acá.
export type RasgoPendiente = 'sobrescribible' | 'sugerido_de'

// Una pasada antes de calcular nada: el motor no devuelve un número que dependa de algo que no implementa.
export function revisarRasgos(
  nodos: readonly Nodo[],
  inputs: ReadonlyMap<string, number>,
  m: Medidor,
): void {
  for (const n of recorrer(nodos, m)) {
    const rasgo = rasgoPendienteDe(n, inputs, m)
    if (rasgo !== undefined) {
      throw new ErrorDelMotor(
        'rasgo_pendiente',
        `El motor todavía no evalúa «${rasgo}» (nodo «${n.id}»): llega en el paso 4.05, prompt 3.`,
        n.id,
      )
    }
  }
}

function rasgoPendienteDe(
  n: Nodo,
  inputs: ReadonlyMap<string, number>,
  m: Medidor,
): RasgoPendiente | undefined {
  if (sobrescribibleDe(n)) return 'sobrescribible'
  if (n.tipo !== 'input') return undefined
  // Con valor tipeado, el número es lo tipeado y no depende del sugerido.
  if (n.sugerido_de !== undefined && buscar(inputs, n.id, m) === undefined) return 'sugerido_de'
  return undefined
}
