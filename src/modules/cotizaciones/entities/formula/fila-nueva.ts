// «Sumar fila» del editor de la fórmula (4.21-3a-2, P4 y P6): una fila nueva debajo de otra, cálculo o constante, con su etiqueta y un nombre (id) propuesto desde ella que
// se puede cambiar antes de crearla. Puro: el id y el pedido se resuelven aquí; compilar el texto es de `compilarFila()` (4.21-1). Una fila con otro nombre es una fila
// nueva, nunca el cambio de id de una que ya existe (P4).
import type { Formula } from '../formula'
import { compilarFila, type ErrorDeFila } from './compilar-fila'

export const MAXIMO_DE_LA_ETIQUETA = 60
// El tope de `esquemaId`: una letra y hasta 40 más.
const MAXIMO_DEL_ID = 41

export type TipoDeFilaNueva = 'calculo' | 'constante'
export type CampoDeFilaNueva = 'etiqueta' | 'id' | 'texto'

export type PedidoDeFilaNueva = {
  // La fila tras la que va (y tras sus auxiliares).
  despuesDe: string
  etiqueta: string
  id: string
  tipo: TipoDeFilaNueva
  texto: string
}

export type ErrorDeFilaNueva = {
  codigo: 'etiqueta_vacia' | 'etiqueta_larga' | 'tipo_distinto' | ErrorDeFila['codigo']
  mensaje: string
  // Junto a qué campo del formulario se dice.
  campo: CampoDeFilaNueva
}
export type ResultadoDeFilaNueva =
  { ok: true; formula: Formula; soltados: string[] } | { ok: false; error: ErrorDeFilaNueva }

// Lo que un nombre nuevo no puede ser: un nodo, una constante, un grupo, un bucket o la clave de un tipo de cambio (el compilador los prohíbe, `compilador-nombres.ts`).
export function ocupadosDe(formula: Formula): ReadonlySet<string> {
  const ocupados = new Set<string>()
  for (const n of formula.definicion.nodos) {
    ocupados.add(n.id)
    if (n.tipo === 'tipo_cambio') ocupados.add(n.clave)
  }
  for (const clave of Object.keys(formula.params.constantes)) ocupados.add(clave)
  for (const g of formula.definicion.grupos ?? []) ocupados.add(g.id)
  for (const bucket of Object.keys(formula.definicion.buckets ?? {})) ocupados.add(bucket)
  return ocupados
}

const sinGuionesEnLasPuntas = (texto: string) => texto.replace(/^_+|_+$/g, '')

// El id que propone la etiqueta: sin tildes, minúsculas ASCII, lo que no es letra ni dígito a `_` (sin repetir ni en las puntas); si empieza por un dígito o queda vacío, con el
// prefijo `fila_`; de hasta 41 caracteres; con `_2`, `_3`… si choca con algo de `ocupados`. Nunca lleva `__` (la reserva el compilador para las auxiliares).
export function idDeFilaNueva(etiqueta: string, ocupados: ReadonlySet<string>): string {
  const limpia = sinGuionesEnLasPuntas(
    etiqueta
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_'),
  )
  const base = sinGuionesEnLasPuntas(
    (limpia === '' || /^[0-9]/.test(limpia) ? `fila_${limpia}` : limpia).slice(0, MAXIMO_DEL_ID),
  )
  let candidato = base
  for (let n = 2; ocupados.has(candidato); n += 1) {
    const sufijo = `_${String(n)}`
    candidato = `${sinGuionesEnLasPuntas(base.slice(0, MAXIMO_DEL_ID - sufijo.length))}${sufijo}`
  }
  return candidato
}

const REGLA_DEL_ID =
  ' Usa minúsculas sin tildes, números y _, hasta 41 caracteres, empezando por una letra.'
const SOLO_UN_NUMERO = 'Un número solo es una constante: elige «Constante» o escribe una operación.'
const MAS_QUE_UN_NUMERO = 'Una constante es un número solo: elige «Cálculo» para una operación.'

const campoDelError = (codigo: ErrorDeFila['codigo']): CampoDeFilaNueva =>
  codigo === 'id_invalido' || codigo === 'id_ocupado' || codigo === 'fila_inexistente'
    ? 'id'
    : 'texto'

const error = (
  codigo: ErrorDeFilaNueva['codigo'],
  mensaje: string,
  campo: CampoDeFilaNueva,
): ResultadoDeFilaNueva => ({ ok: false, error: { codigo, mensaje, campo } })

// Crea la fila: la etiqueta, el compilador (con su destino nuevo) y que lo compilado sea el tipo que se eligió. Nunca lanza.
export function sumarFila(formula: Formula, pedido: PedidoDeFilaNueva): ResultadoDeFilaNueva {
  const etiqueta = pedido.etiqueta.trim()
  if (etiqueta === '') return error('etiqueta_vacia', 'Escribe cómo se llama la fila.', 'etiqueta')
  if (etiqueta.length > MAXIMO_DE_LA_ETIQUETA) {
    return error(
      'etiqueta_larga',
      `La etiqueta pasa de ${String(MAXIMO_DE_LA_ETIQUETA)} caracteres.`,
      'etiqueta',
    )
  }
  const r = compilarFila(formula, {
    destino: { id: pedido.id, etiqueta, despuesDe: pedido.despuesDe },
    texto: pedido.texto,
  })
  if (!r.ok) {
    const mensaje =
      r.error.codigo === 'id_invalido' ? r.error.mensaje + REGLA_DEL_ID : r.error.mensaje
    return error(r.error.codigo, mensaje, campoDelError(r.error.codigo))
  }
  const compilada = r.nodos.find((n) => n.id === pedido.id)
  if (compilada?.tipo === 'constante' && pedido.tipo === 'calculo') {
    return error('tipo_distinto', SOLO_UN_NUMERO, 'texto')
  }
  if (compilada?.tipo !== 'constante' && pedido.tipo === 'constante') {
    return error('tipo_distinto', MAS_QUE_UN_NUMERO, 'texto')
  }
  return { ok: true, formula: r.formula, soltados: r.soltados }
}
