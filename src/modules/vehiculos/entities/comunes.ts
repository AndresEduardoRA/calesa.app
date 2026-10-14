// Los datos comunes de todo vehículo: son columnas de `vehiculos`, no campos del layout (por eso
// `origenes` las tiene como claves reservadas). No hay fila que les ponga etiqueta: éste es el
// único lugar donde un campo del vehículo se nombra con texto fijo. La ficha y el formulario los
// dibujan en dos bloques, delante de los grupos del layout.
import type { ValorMostrado } from '@/shared/lib/campos'
import { formatearNumero } from '@/shared/lib/formato'
import type { CategoriaDeVehiculo } from './campo'
import type { Vehiculo } from './vehiculo'

export type BloqueComun = 'principales' | 'precio'

export const BLOQUES_COMUNES: readonly { clave: BloqueComun; titulo: string }[] = [
  { clave: 'principales', titulo: 'Datos principales' },
  { clave: 'precio', titulo: 'Precio' },
]

export type ClaveComun =
  | 'titulo'
  | 'marca'
  | 'modelo'
  | 'anio'
  | 'vin'
  | 'categoriaId'
  | 'kilometraje'
  | 'placado'
  | 'lote'
  | 'plataforma'
  | 'urlOrigen'
  | 'precio'
  | 'precioNegociable'
  | 'aceptaPermuta'

export type TipoComun = 'texto' | 'entero' | 'monto' | 'si_no' | 'vin' | 'enlace' | 'categoria'

export type CampoComun = {
  clave: ClaveComun
  etiqueta: string
  tipo: TipoComun
  bloque: BloqueComun
  requerido?: true
  // El lote, la plataforma y el enlace sólo existen en un origen de subasta.
  soloSubasta?: true
  // Los mismos topes que valida `_vehiculo_aplicar()`.
  largo?: number
  minimo?: number
  maximo?: number
  unidad?: string
}

const TODOS: readonly CampoComun[] = [
  {
    clave: 'titulo',
    etiqueta: 'Título',
    tipo: 'texto',
    bloque: 'principales',
    requerido: true,
    largo: 160,
  },
  { clave: 'marca', etiqueta: 'Marca', tipo: 'texto', bloque: 'principales', largo: 80 },
  { clave: 'modelo', etiqueta: 'Modelo', tipo: 'texto', bloque: 'principales', largo: 80 },
  {
    clave: 'anio',
    etiqueta: 'Año',
    tipo: 'entero',
    bloque: 'principales',
    minimo: 1900,
    maximo: 2100,
  },
  { clave: 'vin', etiqueta: 'VIN', tipo: 'vin', bloque: 'principales', largo: 17 },
  { clave: 'categoriaId', etiqueta: 'Categoría', tipo: 'categoria', bloque: 'principales' },
  {
    clave: 'kilometraje',
    etiqueta: 'Kilometraje',
    tipo: 'entero',
    bloque: 'principales',
    minimo: 0,
    maximo: 2_000_000_000,
    unidad: 'km',
  },
  { clave: 'placado', etiqueta: 'Placado', tipo: 'si_no', bloque: 'principales' },
  {
    clave: 'lote',
    etiqueta: 'Lote',
    tipo: 'texto',
    bloque: 'principales',
    soloSubasta: true,
    largo: 40,
  },
  {
    clave: 'plataforma',
    etiqueta: 'Plataforma',
    tipo: 'texto',
    bloque: 'principales',
    soloSubasta: true,
    largo: 40,
  },
  {
    clave: 'urlOrigen',
    etiqueta: 'Enlace de la subasta',
    tipo: 'enlace',
    bloque: 'principales',
    soloSubasta: true,
    largo: 500,
  },
  {
    clave: 'precio',
    etiqueta: 'Precio',
    tipo: 'monto',
    bloque: 'precio',
    minimo: 0,
    maximo: 999_999_999_999,
  },
  { clave: 'precioNegociable', etiqueta: 'Precio negociable', tipo: 'si_no', bloque: 'precio' },
  { clave: 'aceptaPermuta', etiqueta: 'Acepta permuta', tipo: 'si_no', bloque: 'precio' },
]

// Los datos comunes que lleva lo que entra por un origen de ese tipo.
export function camposComunes(tipoDeOrigen: 'subasta' | 'manual'): CampoComun[] {
  return TODOS.filter((campo) => tipoDeOrigen === 'subasta' || !campo.soloSubasta)
}

const VACIO: ValorMostrado = { tipo: 'vacio' }

type Contexto = { categorias: readonly CategoriaDeVehiculo[]; locale?: string }

function numeroComun(campo: CampoComun, valor: number, locale: string | undefined): ValorMostrado {
  if (campo.tipo === 'monto') {
    return { tipo: 'monto', valor }
  }
  // Un año no lleva separador de miles.
  const numero = campo.clave === 'anio' ? String(valor) : formatearNumero(valor, { locale })
  return { tipo: 'texto', texto: campo.unidad ? `${numero} ${campo.unidad}` : numero }
}

function textoComun(campo: CampoComun, valor: string, contexto: Contexto): ValorMostrado {
  if (campo.tipo === 'categoria') {
    const categoria = contexto.categorias.find((una) => una.id === valor)
    return categoria ? { tipo: 'texto', texto: categoria.nombre } : VACIO
  }
  // Sólo se enlaza una dirección web.
  if (campo.tipo === 'enlace' && /^https?:\/\//i.test(valor)) {
    return { tipo: 'enlace', url: valor }
  }
  return { tipo: 'texto', texto: valor }
}

// Qué mostrar de un dato común en la ficha.
export function valorComun(
  campo: CampoComun,
  vehiculo: Vehiculo,
  contexto: Contexto,
): ValorMostrado {
  const valor = vehiculo[campo.clave]
  if (valor === null || valor === '') {
    return VACIO
  }
  if (typeof valor === 'boolean') {
    return { tipo: 'texto', texto: valor ? 'Sí' : 'No' }
  }
  return typeof valor === 'number'
    ? numeroComun(campo, valor, contexto.locale)
    : textoComun(campo, valor, contexto)
}
