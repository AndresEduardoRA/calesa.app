// Qué control dibuja cada dato del formulario de un vehículo: los comunes (columnas) y los campos
// del layout de su origen. Es un solo vocabulario para los dos, así el formulario no distingue de
// dónde sale un campo.
import { campoDeFormulario, type CampoDeFormulario, type Control } from '@/shared/lib/campos'
import { type CampoDeVehiculo, type CategoriaDeVehiculo } from '../../entities/campo'
import type { CampoComun } from '../../entities/comunes'
import { claveDeAtributo } from '../../entities/formulario'

export type { CampoDeFormulario, Control }

type Opcion = { valor: string; etiqueta: string }

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

// El control de un campo del layout. `guardado` es lo que el vehículo ya tiene en ese campo.
export function campoDeAtributo(campo: CampoDeVehiculo, guardado: unknown): CampoDeFormulario {
  return campoDeFormulario(campo, guardado, claveDeAtributo(campo.clave))
}
