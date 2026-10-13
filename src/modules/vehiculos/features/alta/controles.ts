// Qué control dibuja cada dato del formulario de un vehículo: los comunes (columnas) y los campos
// del layout de su origen. Es un solo vocabulario para los dos, así el formulario no distingue de
// dónde sale un campo.
import {
  type CampoDeVehiculo,
  type CategoriaDeVehiculo,
  type OpcionDeCampo,
  type TipoDeCampo,
} from '../../entities/campo'
import type { CampoComun } from '../../entities/comunes'
import { claveDeAtributo } from '../../entities/formulario'

type Opcion = { valor: string; etiqueta: string }

export type Control =
  | { tipo: 'texto'; largo?: number; modo?: 'text' | 'url'; mayusculas?: boolean }
  | { tipo: 'texto_largo' }
  | { tipo: 'numero'; entero: boolean; unidad?: string }
  | { tipo: 'si_no' }
  | { tipo: 'opcion'; opciones: Opcion[] }
  | { tipo: 'varias'; opciones: Opcion[] }
  | { tipo: 'fecha' }
  | { tipo: 'fecha_hora' }

export type CampoDeFormulario = {
  // La clave del dato en el estado del formulario (`titulo`, `a.color`).
  clave: string
  etiqueta: string
  requerido: boolean
  control: Control
}

type DeComun = (campo: CampoComun, opciones: Opcion[]) => Control

const CONTROL_COMUN: Record<CampoComun['tipo'], DeComun> = {
  texto: (campo) => ({ tipo: 'texto', largo: campo.largo }),
  entero: (campo) => ({ tipo: 'numero', entero: true, unidad: campo.unidad }),
  monto: () => ({ tipo: 'numero', entero: false }),
  si_no: () => ({ tipo: 'si_no' }),
  vin: () => ({ tipo: 'texto', largo: 17, mayusculas: true }),
  enlace: (campo) => ({ tipo: 'texto', largo: campo.largo, modo: 'url' }),
  categoria: (_campo, opciones) => ({ tipo: 'opcion', opciones }),
}

// Las categorías que se pueden elegir: las activas, más la que el vehículo ya tiene.
function opcionesDeCategoria(categorias: readonly CategoriaDeVehiculo[], actual: string | null) {
  return categorias
    .filter((categoria) => categoria.activa || categoria.id === actual)
    .map((categoria) => ({ valor: categoria.id, etiqueta: categoria.nombre }))
}

export function camposDeComunes(
  comunes: readonly CampoComun[],
  categorias: readonly CategoriaDeVehiculo[],
  categoriaActual: string | null,
): (CampoDeFormulario & { bloque: CampoComun['bloque'] })[] {
  const opciones = opcionesDeCategoria(categorias, categoriaActual)
  return comunes.map((campo) => ({
    clave: campo.clave,
    etiqueta: campo.etiqueta,
    requerido: campo.requerido === true,
    control: CONTROL_COMUN[campo.tipo](campo, opciones),
    bloque: campo.bloque,
  }))
}

// Una opción que el vehículo tiene guardada y ya se sacó del campo se sigue ofreciendo, marcada:
// si no, abrir y guardar el formulario la borraría sin que nadie lo pida.
function opcionesDeCampo(campo: CampoDeVehiculo, guardado: unknown): Opcion[] {
  const vigentes = campo.opciones.map((o: OpcionDeCampo) => ({
    valor: o.clave,
    etiqueta: o.etiqueta,
  }))
  const conocidas = new Set(vigentes.map((opcion) => opcion.valor))
  const guardadas = (Array.isArray(guardado) ? guardado : [guardado]).filter(
    (una): una is string => typeof una === 'string' && una !== '' && !conocidas.has(una),
  )
  return [
    ...vigentes,
    ...guardadas.map((valor) => ({ valor, etiqueta: `${valor} (ya no se ofrece)` })),
  ]
}

type DeAtributo = (campo: CampoDeVehiculo, guardado: unknown) => Control

const CONTROL_DE_TIPO: Record<TipoDeCampo, DeAtributo> = {
  texto: () => ({ tipo: 'texto', largo: 500 }),
  texto_largo: () => ({ tipo: 'texto_largo' }),
  lote: () => ({ tipo: 'texto', largo: 500 }),
  vin: () => ({ tipo: 'texto', largo: 17, mayusculas: true }),
  url: () => ({ tipo: 'texto', largo: 500, modo: 'url' }),
  numero: () => ({ tipo: 'numero', entero: false }),
  moneda: () => ({ tipo: 'numero', entero: false }),
  booleano: () => ({ tipo: 'si_no' }),
  fecha: () => ({ tipo: 'fecha' }),
  fecha_hora: () => ({ tipo: 'fecha_hora' }),
  opcion: (campo, guardado) => ({ tipo: 'opcion', opciones: opcionesDeCampo(campo, guardado) }),
  multi_opcion: (campo, guardado) => ({
    tipo: 'varias',
    opciones: opcionesDeCampo(campo, guardado),
  }),
}

// El control de un campo del layout. `guardado` es lo que el vehículo ya tiene en ese campo.
export function campoDeAtributo(campo: CampoDeVehiculo, guardado: unknown): CampoDeFormulario {
  return {
    clave: claveDeAtributo(campo.clave),
    etiqueta: campo.etiqueta,
    requerido: campo.requerido,
    control: CONTROL_DE_TIPO[campo.tipo](campo, guardado),
  }
}
