// Lo que guarda el estado de un formulario de campos: lo que la persona ve y escribe (texto, sí o
// no, lista), no el dato ya convertido: de eso se ocupa `esquema-de-valor.ts`, igual en el navegador
// y en el servidor.
import { localDeInstante } from '../fechas'
import { formatearParaEditar } from '../formato'
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

// Un valor guardado (o un valor por defecto del layout) como lo muestra el formulario. Un número de un campo numérico se escribe con el
// locale de la empresa y sin miles (4.13-3c): es lo que el lector de lo tipeado lee de vuelta sin aviso, así abrir y guardar sin tocar no lo cambia.
export function deAtributo(
  campo: { tipo: TipoDeCampo },
  valor: unknown,
  zona: string | undefined,
  locale: string,
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
  return comoTexto(campo, valor, locale)
}

function comoTexto(campo: { tipo: TipoDeCampo }, valor: unknown, locale: string): string {
  if (typeof valor === 'number' && (campo.tipo === 'numero' || campo.tipo === 'moneda')) {
    return formatearParaEditar(valor, { locale })
  }
  return typeof valor === 'string' || typeof valor === 'number' ? String(valor) : ''
}
