// Lo puro de «Guardar el borrador» (4.21-3b-1): qué fórmula se guarda (con el texto que reescribió el ⚙), qué pedido sale según la base del editor, y si hay algo
// por guardar. Vive junto al soporte del editor porque usa sus filas ya calculadas (`FilaParaDibujar`, `TextoDeLaFila`) y `paramsPlanos`: nada se recorre de nuevo.
import type { Formula } from '../../../entities/formula'
import type { BaseDelEditor } from '../../../entities/formula/edicion'
import type { PedidoDeGuardar } from '../../../entities/formula/repositorio'
import { paramsPlanos, type FilaParaDibujar } from './use-editor-de-la-formula.soporte'

// La fórmula que se guarda: cada fila `reescrita` (el ⚙ cambió un número que su texto dice) guarda el texto que ya dice el valor nuevo (4-5). Las demás quedan
// como están: la que `no_manda` conserva su texto (el ⚙ queda en `params`) y la que no tiene texto no gana uno. Sin reescritas, la misma fórmula. No toca lo que recibe.
export function formulaParaGuardar(trabajo: Formula, filas: readonly FilaParaDibujar[]): Formula {
  const reescritos = new Map<string, string>()
  for (const fila of filas) {
    if (fila.texto.modo === 'reescrito') reescritos.set(fila.id, fila.texto.texto)
  }
  if (reescritos.size === 0) return trabajo
  const nodos = trabajo.definicion.nodos.map((nodo) => {
    const texto = reescritos.get(nodo.id)
    if (texto === undefined || (nodo.tipo !== 'calculo' && nodo.tipo !== 'constante')) return nodo
    return { ...nodo, texto }
  })
  return { ...trabajo, definicion: { ...trabajo.definicion, nodos } }
}

// El pedido según la base: sobre la publicada crea (su id como esperada, su diseño y la nota nula: la de la publicada es de su publicación); sobre el borrador
// pisa con su hora, su diseño y su nota (la RPC los escribe tal cual: mandarlos nulos los borraría).
export function pedidoDeGuardar(
  base: BaseDelEditor,
  guardable: Formula,
  origenId: string,
): PedidoDeGuardar {
  const comun = {
    origenId,
    definicion: guardable.definicion,
    params: paramsPlanos(guardable),
    diseno: base.diseno,
  }
  return base.estado === 'publicada'
    ? { ...comun, nota: null, esperada: { sobre: 'publicada', publicadaId: base.id } }
    : {
        ...comun,
        nota: base.nota,
        esperada: { sobre: 'borrador', actualizadoEn: base.actualizadoEn },
      }
}

// Iguales en profundidad: el orden de las claves no cuenta (un nodo recompilado puede traerlas en otro), el de una lista sí, y una clave indefinida es una ausente.
function iguales(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((x, i) => iguales(x, b[i]))
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const ra = a as Record<string, unknown>
  const rb = b as Record<string, unknown>
  const clavesA = Object.keys(ra).filter((k) => ra[k] !== undefined)
  const clavesB = Object.keys(rb).filter((k) => rb[k] !== undefined)
  return clavesA.length === clavesB.length && clavesA.every((k) => iguales(ra[k], rb[k]))
}

// Hay algo por guardar si lo que se mandaría (la definición o los `params`) no es lo guardado. Una reescrita sola cuenta: guardarla es lo que la arregla.
// O(nodos), una vez por cambio aplicado.
export function hayCambiosPorGuardar(guardada: Formula, guardable: Formula): boolean {
  if (guardada === guardable) return false
  return (
    !iguales(guardada.definicion, guardable.definicion) ||
    !iguales(paramsPlanos(guardada), paramsPlanos(guardable))
  )
}

// Lo que dejó el último «Guardar el borrador» (C5): entró; un PT409 con el texto de la base (nombra a una persona y cuándo); o un error con su texto propio.
export type EstadoDelGuardado =
  | { tipo: 'quieto' }
  | { tipo: 'entro' }
  | { tipo: 'conflicto'; mensaje: string }
  | { tipo: 'regla' }
  | { tipo: 'sin_permiso' }
  | { tipo: 'sin_respuesta' }
  | { tipo: 'error'; mensaje: string }

export const ESPERA_A_LA_FILA = 'Aplica o cancela la fila abierta.'
export const SIN_CAMBIOS = 'No hay cambios por guardar.'
export const CORREGIR = 'Corrige lo marcado para guardar.'
export const SE_GUARDO = 'Se guardó el borrador.'
export const MENSAJE_DE_REGLA =
  'La base no aceptó la fórmula por una regla que el editor no revisó: no se guardó.'
export const MENSAJE_SIN_RESPUESTA = 'No sabemos si se guardó: recarga para verlo.'

// Por qué el botón espera, en este orden: lo abierto (una fila o «Sumar fila»), el rechazo de `validarFormula()`, que no haya nada por guardar. Nulo: listo.
export function motivoParaNoGuardar(estado: {
  hayAbierta: boolean
  hayRechazo: boolean
  hayCambios: boolean
}): string | null {
  if (estado.hayAbierta) return ESPERA_A_LA_FILA
  if (estado.hayRechazo) return CORREGIR
  return estado.hayCambios ? null : SIN_CAMBIOS
}
