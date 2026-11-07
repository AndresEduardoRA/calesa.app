'use client'

import type { Nodo, NodoCalculo } from '../../../../entities/nodos'
import { ValorDeConstante } from './valor-de-constante'

type Props = {
  nodo: Nodo
  // El valor de una constante (en `params`); nulo si no lo tiene.
  valor: number | null
}

const OPERACIONES: Record<NodoCalculo['op'], string> = {
  suma: 'suma de',
  restar: 'resta de',
  multiplicar: 'multiplica',
  dividir: 'divide',
  porcentaje_de: 'porcentaje de',
  si: 'si',
  redondear: 'redondea',
  depreciar: 'deprecia',
}

// Los campos propios de la operación, en palabras.
function propiosDe(nodo: NodoCalculo): string[] {
  switch (nodo.op) {
    case 'porcentaje_de':
      return [`porcentaje: ${nodo.pct}`]
    case 'si':
      return [`condición: ${nodo.condicion}`]
    case 'redondear':
      return [`decimales: ${String(nodo.n)}`]
    case 'depreciar':
      return [`tabla: ${nodo.tabla}`, `sobre: ${nodo.sobre}`, `columna: ${nodo.columna}`]
    case 'suma':
    case 'restar':
    case 'multiplicar':
    case 'dividir':
      return []
    default: {
      const _: never = nodo
      return _
    }
  }
}

// Una fila de cálculo o constante que no se puede escribir como texto (P2 del 4.21-1: `textoDeNodo()` da nulo, p. ej. un `de` que nombra una fila posterior), de
// sólo lectura: qué calcula o cuánto vale. Se puede escribir un texto para ella («Editar» abre el campo vacío).
export function CamposDeLaFila({ nodo, valor }: Props) {
  if (nodo.tipo === 'constante') {
    return (
      <p className="text-(--color-ink)">
        Vale{' '}
        {valor === null ? (
          <span aria-label="Sin valor">—</span>
        ) : (
          <ValorDeConstante valor={valor} formato={nodo.formato} />
        )}
      </p>
    )
  }
  if (nodo.tipo !== 'calculo') {
    return null
  }
  return (
    <p className="min-w-0 break-words text-(--color-ink)">
      Calcula: {OPERACIONES[nodo.op]}{' '}
      {nodo.de.map((id, i) => (
        <span key={`${id}:${String(i)}`}>
          {i > 0 ? ', ' : null}
          <code>{id}</code>
        </span>
      ))}
      {propiosDe(nodo).map((campo) => (
        <span key={campo}>; {campo}</span>
      ))}
    </p>
  )
}
