// Qué es un campo configurable. Lo comparten el layout de un origen (los datos de un vehículo) y,
// más adelante, el de los leads: acá vive lo que no depende de qué se configura. Qué campos hay,
// quién los cambia y cuáles son sensibles lo decide cada módulo.

// Los tipos de los campos de un vehículo.
export const TIPOS_DE_VEHICULO = [
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
export type TipoDeVehiculo = (typeof TIPOS_DE_VEHICULO)[number]

// Los de un lead: los de un vehículo sin VIN ni lote, y con el correo y el documento (sensibles).
export const TIPOS_DE_LEAD = [
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
  'correo',
  'documento',
] as const
export type TipoDeLead = (typeof TIPOS_DE_LEAD)[number]

// Todos: lo que sabe el motor. Cada layout ofrece sólo los suyos; la base lo cuida con un `check`
// y un test lo compara con el enum `tipo_campo`.
export const TIPOS_DE_CAMPO = [...TIPOS_DE_VEHICULO, 'correo', 'documento'] as const
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
  correo: 'Correo',
  documento: 'Documento',
}

// El tipo del formulario, dentro de los que ofrece ese layout (el selector no deja elegir otro).
export function tipoEntre<Tipo extends TipoDeCampo>(
  ofrecidos: readonly Tipo[],
  tipo: TipoDeCampo,
  porDefecto: Tipo,
): Tipo {
  return ofrecidos.find((otro) => otro === tipo) ?? porDefecto
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
export type CampoBase<Tipo extends TipoDeCampo = TipoDeCampo> = {
  id: string
  clave: string
  etiqueta: string
  tipo: Tipo
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
