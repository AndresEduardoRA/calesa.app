// Qué control dibuja cada tipo de campo configurable. Es un solo vocabulario para lo que sale de un
// layout y para lo que un módulo agrega por su cuenta (las columnas de un vehículo), así el
// formulario no distingue de dónde sale un campo.
import type { OpcionDeCampo, TipoDeCampo } from './tipos'

export type OpcionDeControl = { valor: string; etiqueta: string }

export type Control =
  | { tipo: 'texto'; largo?: number; modo?: 'text' | 'url' | 'email'; mayusculas?: boolean }
  | { tipo: 'texto_largo' }
  | { tipo: 'numero'; entero: boolean; unidad?: string }
  | { tipo: 'si_no' }
  | { tipo: 'opcion'; opciones: OpcionDeControl[] }
  | { tipo: 'varias'; opciones: OpcionDeControl[] }
  | { tipo: 'fecha' }
  | { tipo: 'fecha_hora' }

export type CampoDeFormulario = {
  // La clave del dato en el estado del formulario (`titulo`, `a.color`).
  clave: string
  etiqueta: string
  requerido: boolean
  control: Control
}

// Lo que el control necesita saber de un campo del layout.
export type CampoConControl = {
  etiqueta: string
  tipo: TipoDeCampo
  opciones: readonly OpcionDeCampo[]
  requerido: boolean
}

// Una opción que el registro tiene guardada y ya se sacó del campo se sigue ofreciendo, marcada: si
// no, abrir y guardar el formulario la borraría sin que nadie lo pida.
export function opcionesDeCampo(
  opciones: readonly OpcionDeCampo[],
  guardado: unknown,
): OpcionDeControl[] {
  const vigentes = opciones.map((o) => ({ valor: o.clave, etiqueta: o.etiqueta }))
  const conocidas = new Set(vigentes.map((opcion) => opcion.valor))
  const guardadas = (Array.isArray(guardado) ? guardado : [guardado]).filter(
    (una): una is string => typeof una === 'string' && una !== '' && !conocidas.has(una),
  )
  return [
    ...vigentes,
    ...guardadas.map((valor) => ({ valor, etiqueta: `${valor} (ya no se ofrece)` })),
  ]
}

type DeTipo = (campo: CampoConControl, guardado: unknown) => Control

const CONTROL_DE_TIPO: Record<TipoDeCampo, DeTipo> = {
  texto: () => ({ tipo: 'texto', largo: 500 }),
  texto_largo: () => ({ tipo: 'texto_largo' }),
  lote: () => ({ tipo: 'texto', largo: 500 }),
  vin: () => ({ tipo: 'texto', largo: 17, mayusculas: true }),
  url: () => ({ tipo: 'texto', largo: 500, modo: 'url' }),
  correo: () => ({ tipo: 'texto', largo: 160, modo: 'email' }),
  documento: () => ({ tipo: 'texto', largo: 30 }),
  numero: () => ({ tipo: 'numero', entero: false }),
  moneda: () => ({ tipo: 'numero', entero: false }),
  booleano: () => ({ tipo: 'si_no' }),
  fecha: () => ({ tipo: 'fecha' }),
  fecha_hora: () => ({ tipo: 'fecha_hora' }),
  opcion: (campo, guardado) => ({
    tipo: 'opcion',
    opciones: opcionesDeCampo(campo.opciones, guardado),
  }),
  multi_opcion: (campo, guardado) => ({
    tipo: 'varias',
    opciones: opcionesDeCampo(campo.opciones, guardado),
  }),
}

// El control de un campo del layout. `guardado` es lo que el registro ya tiene en ese campo y
// `clave` cómo se llama el dato en el formulario (cada módulo decide su prefijo).
export function campoDeFormulario(
  campo: CampoConControl,
  guardado: unknown,
  clave: string,
): CampoDeFormulario {
  return {
    clave,
    etiqueta: campo.etiqueta,
    requerido: campo.requerido,
    control: CONTROL_DE_TIPO[campo.tipo](campo, guardado),
  }
}
