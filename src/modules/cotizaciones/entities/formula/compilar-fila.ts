// Compilar el texto de una fila en su lugar (4.21-1, C3 a C6 en `compilar-fila-base.ts`) y no pisar un ⚙ sin preguntar (C10, 4-5): si el texto guardado
// «ya no manda» (`texto-vigente.ts`: el ⚙ dejó un valor que el texto no dice y no se pudo reescribir) y el texto nuevo cambia o quita una constante de la
// fila, recompilar da `pisa_un_valor` con lo que se pisaría; con `confirmaPisar` compila. Con el texto al día o reescrito no pregunta: cambiar un número
// es lo que la persona tipeó.
import type { Formula } from '../formula'
import type { Medidor } from '../medidor'
import {
  compilarFilaBase,
  type CambioQueSePisa,
  type FilaCompilada,
  type PedidoBase,
  type ResultadoDeFila,
} from './compilar-fila-base'
import { filasDe, type Fila } from './filas'
import { textoVigente } from './texto-vigente'

export type {
  CambioQueSePisa,
  DestinoDeLaFila,
  ErrorDeFila,
  ResultadoDeFila,
} from './compilar-fila-base'
export type PedidoDeFila = PedidoBase & { confirmaPisar?: boolean }

// Lo que recompilar pisaría: cada constante de la fila vieja (la raíz o una auxiliar) que queda con otro valor o desaparece.
function cambiosQueSePisan(formula: Formula, fila: Fila, r: FilaCompilada): CambioQueSePisa[] {
  const cambios: CambioQueSePisa[] = []
  for (const n of formula.definicion.nodos.slice(fila.desde, fila.posicion + 1)) {
    const guardado = formula.params.constantes[n.id]
    if (n.tipo !== 'constante' || guardado === undefined) continue
    const sigue = r.nodos.some((x) => x.id === n.id && x.tipo === 'constante')
    const nuevo = sigue ? (r.params[n.id] ?? null) : null
    if (nuevo === null || !Object.is(nuevo, guardado)) cambios.push({ id: n.id, guardado, nuevo })
  }
  return cambios
}

export function compilarFila(
  formula: Formula,
  pedido: PedidoDeFila,
  medidor?: Medidor,
): ResultadoDeFila {
  const m = medidor ?? { visitas: 0 }
  const r = compilarFilaBase(formula, pedido, m)
  const destino = pedido.destino
  if (!r.ok || pedido.confirmaPisar === true || !('existente' in destino)) return r
  if (textoVigente(formula, destino.existente, m).estado !== 'no_manda') return r
  const fila = filasDe(formula.definicion, m).find((f) => f.nodo.id === destino.existente)
  const cambios = fila === undefined ? [] : cambiosQueSePisan(formula, fila, r)
  if (cambios.length === 0) return r
  return {
    ok: false,
    error: {
      codigo: 'pisa_un_valor',
      mensaje: 'Este texto cambia un valor que se ajustó con ⚙: confirma que quieres pisarlo.',
      cambios,
    },
  }
}
