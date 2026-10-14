// Lo que guarda el estado de un formulario de campos: lo que la persona ve y escribe (texto, sí o
// no, lista), no el dato ya convertido: de eso se ocupa `esquema-de-valor.ts`, igual en el navegador
// y en el servidor.
import { localDeInstante } from '../fechas'
import type { TipoDeCampo } from './tipos'

// Texto para lo que se escribe o se elige; `boolean | null` para un sí o no (null = sin dato);
// lista para un campo de varias opciones.
export type ValorDeFormulario = string | boolean | null | string[]

export type ValoresDeFormulario = Record<string, ValorDeFormulario>

// El valor «sin dato» de cada forma de campo.
export function vacioDe(campo: { tipo: TipoDeCampo }): ValorDeFormulario {
  if (campo.tipo === 'booleano') {
    return null
  }
  return campo.tipo === 'multi_opcion' ? [] : ''
}

// Un valor guardado (o un valor por defecto del layout) como lo muestra el formulario.
export function deAtributo(
  campo: { tipo: TipoDeCampo },
  valor: unknown,
  zona: string | undefined,
): ValorDeFormulario {
  if (valor === undefined || valor === null) {
    return vacioDe(campo)
  }
  if (campo.tipo === 'booleano') {
    return typeof valor === 'boolean' ? valor : null
  }
  if (campo.tipo === 'multi_opcion') {
    return Array.isArray(valor) ? valor.filter((uno) => typeof uno === 'string') : []
  }
  if (campo.tipo === 'fecha_hora') {
    return typeof valor === 'string' ? localDeInstante(valor, { zona }) : ''
  }
  return typeof valor === 'string' || typeof valor === 'number' ? String(valor) : ''
}
