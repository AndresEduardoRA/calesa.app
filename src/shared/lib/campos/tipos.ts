// Qué es un campo configurable. Lo comparten el layout de un origen (los datos de un vehículo) y,
// más adelante, el de los leads: acá vive lo que no depende de qué se configura. Qué campos hay,
// quién los cambia y cuáles son sensibles lo decide cada módulo.

export const TIPOS_DE_CAMPO = [
  'texto',
  'texto_largo',
  'numero',
  'moneda',
  'booleano',
  'fecha',
  'fecha_hora',
  'opcion',
  'multi_opcion',
  'url',
  'vin',
  'lote',
] as const
export type TipoDeCampo = (typeof TIPOS_DE_CAMPO)[number]

export const ETIQUETA_DE_TIPO_DE_CAMPO: Record<TipoDeCampo, string> = {
  texto: 'Texto',
  texto_largo: 'Texto largo',
  numero: 'Número',
  moneda: 'Monto',
  booleano: 'Sí o no',
  fecha: 'Fecha',
  fecha_hora: 'Fecha y hora',
  opcion: 'Una opción',
  multi_opcion: 'Varias opciones',
  url: 'Enlace',
  vin: 'VIN',
  lote: 'Lote',
}

export function tieneOpciones(tipo: TipoDeCampo): boolean {
  return tipo === 'opcion' || tipo === 'multi_opcion'
}

export type OpcionDeCampo = { clave: string; etiqueta: string }

// Lo que el formulario de alta trae puesto en un campo. Qué forma admite cada tipo lo dice
// `valor-defecto.ts`.
export type ValorDefecto = string | number | boolean | string[]

// Lo que tiene todo campo configurable, sea del dominio que sea. Cada módulo suma lo suyo
// (banderas, el contenedor, una ruta de apibara).
export type CampoBase = {
  id: string
  clave: string
  etiqueta: string
  tipo: TipoDeCampo
  opciones: OpcionDeCampo[]
  requerido: boolean
  // Sólo precarga el alta; null = nada.
  valorDefecto: ValorDefecto | null
  grupo: string | null
  orden: number
  // Viene de fábrica: no se elimina ni cambia de tipo ni de clave.
  esSistema: boolean
  activo: boolean
  actualizadoEn: string
}
