// El estado del formulario de un vehículo: una entrada por dato común y una por campo activo del
// layout (con el prefijo `a.`). Guarda lo que la persona ve y escribe (texto, sí o no, lista), no
// el dato ya convertido: de eso se ocupa `esquema.ts`, igual en el navegador y en el servidor.
import { localDeInstante } from '@/shared/lib/fechas'
import { PREFIJO_DE_ATRIBUTO, type CampoDeVehiculo } from './campo'
import type { CampoComun } from './comunes'
import type { Vehiculo } from './vehiculo'

// Texto para lo que se escribe o se elige; `boolean | null` para un sí o no (null = sin dato);
// lista para un campo de varias opciones.
export type ValorDeFormulario = string | boolean | null | string[]

export type ValoresDeFormulario = Record<string, ValorDeFormulario>

export const claveDeAtributo = (clave: string) => PREFIJO_DE_ATRIBUTO + clave

// El valor «sin dato» de cada forma de campo.
export function vacioDe(campo: Pick<CampoDeVehiculo, 'tipo'>): ValorDeFormulario {
  if (campo.tipo === 'booleano') {
    return null
  }
  return campo.tipo === 'multi_opcion' ? [] : ''
}

function deComun(campo: CampoComun, vehiculo: Vehiculo | null): ValorDeFormulario {
  const valor = vehiculo?.[campo.clave] ?? null
  if (campo.tipo === 'si_no') {
    return typeof valor === 'boolean' ? valor : null
  }
  return valor === null ? '' : String(valor)
}

// Un valor guardado (o un valor por defecto del layout) como lo muestra el formulario.
function deAtributo(campo: CampoDeVehiculo, valor: unknown, zona: string | undefined) {
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

type Fuentes = {
  comunes: readonly CampoComun[]
  // Los campos activos del layout.
  campos: readonly CampoDeVehiculo[]
  // null = un alta: los campos del layout arrancan con su valor por defecto.
  vehiculo: Vehiculo | null
  zona?: string
}

export function valoresIniciales({
  comunes,
  campos,
  vehiculo,
  zona,
}: Fuentes): ValoresDeFormulario {
  const valores: ValoresDeFormulario = {}
  for (const campo of comunes) {
    valores[campo.clave] = deComun(campo, vehiculo)
  }
  for (const campo of campos) {
    const guardado = vehiculo ? vehiculo.atributos[campo.clave] : campo.valorDefecto
    valores[claveDeAtributo(campo.clave)] = deAtributo(campo, guardado, zona)
  }
  return valores
}
