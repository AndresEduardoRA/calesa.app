// Lo que nace con un origen según su tipo: espejo de `origen_preconfigurar_campos()` y de
// `origen_crear_flujo()` (supabase/migrations/…000300_triggers.sql). Sirve sólo para mostrar qué
// va a nacer antes de crearlo: la base es la que crea. `preconfiguraciones.test.ts` lee el SQL y
// falla si las dos listas divergen.
import type { TipoDeOrigen } from './origen'

export type CampoPreconfigurado = {
  clave: string
  etiqueta: string
  tipo: string
  grupo: string
  orden: number
  enTarjeta: boolean
  filtrable: boolean
  publicoWeb: boolean
  // De qué campo del scraper de apibara se llena. Sólo en subasta.
  claveApibara?: string
}

type Fila = readonly [
  clave: string,
  etiqueta: string,
  tipo: string,
  grupo: string,
  orden: number,
  enTarjeta: boolean,
  filtrable: boolean,
  publicoWeb: boolean,
  claveApibara?: string,
]

function campos(filas: readonly Fila[]): CampoPreconfigurado[] {
  return filas.map(
    ([clave, etiqueta, tipo, grupo, orden, enTarjeta, filtrable, publicoWeb, claveApibara]) => ({
      clave,
      etiqueta,
      tipo,
      grupo,
      orden,
      enTarjeta,
      filtrable,
      publicoWeb,
      ...(claveApibara === undefined ? {} : { claveApibara }),
    }),
  )
}

const DE_SUBASTA = campos([
  ['color', 'Color', 'texto', 'Vehículo', 10, true, true, true, 'color'],
  ['transmision', 'Transmisión', 'opcion', 'Vehículo', 20, true, true, true, 'transmission'],
  ['combustible', 'Combustible', 'opcion', 'Vehículo', 30, false, true, true, 'fuel_type'],
  ['motor', 'Motor', 'texto', 'Vehículo', 40, false, false, true, 'engine_type'],
  ['cilindros', 'Cilindros', 'numero', 'Vehículo', 50, false, true, true, 'cylinders'],
  ['traccion', 'Tracción', 'opcion', 'Vehículo', 60, false, true, true, 'drivetrain'],
  ['carroceria', 'Carrocería', 'opcion', 'Vehículo', 70, false, true, true, 'body_style'],
  ['tipo_vehiculo', 'Tipo', 'opcion', 'Vehículo', 80, false, true, true, 'vehicle_type'],
  ['codigo_titulo', 'Código de título', 'texto', 'Subasta', 90, true, true, true, 'title_code'],
  ['dano_principal', 'Daño principal', 'texto', 'Subasta', 100, true, true, true, 'primary_damage'],
  [
    'dano_secundario',
    'Daño secundario',
    'texto',
    'Subasta',
    110,
    false,
    true,
    true,
    'secondary_damage',
  ],
  [
    'enciende_y_anda',
    'Enciende y anda',
    'booleano',
    'Subasta',
    120,
    true,
    true,
    true,
    'run_and_drive',
  ],
  ['tiene_llave', 'Tiene llave', 'booleano', 'Subasta', 130, false, true, true, 'has_key'],
  [
    'valor_mercado',
    'Valor de mercado (USD)',
    'moneda',
    'Subasta',
    140,
    false,
    false,
    true,
    'estimated_retail_value',
  ],
  ['ubicacion', 'Ubicación', 'texto', 'Subasta', 150, true, true, true, 'location'],
  [
    'nota_subasta',
    'Nota de la subasta',
    'texto_largo',
    'Subasta',
    160,
    false,
    false,
    true,
    'auction_note',
  ],
  ['banderas_subasta', 'Banderas', 'multi_opcion', 'Subasta', 170, false, true, true, 'sale_flags'],
])

const MANUAL = campos([
  ['color', 'Color', 'texto', 'Vehículo', 10, true, true, true],
  ['transmision', 'Transmisión', 'opcion', 'Vehículo', 20, true, true, true],
  ['combustible', 'Combustible', 'opcion', 'Vehículo', 30, false, true, true],
  ['motor', 'Motor', 'texto', 'Vehículo', 40, false, false, true],
  ['traccion', 'Tracción', 'opcion', 'Vehículo', 50, false, true, true],
  ['carroceria', 'Carrocería', 'opcion', 'Vehículo', 60, false, true, true],
  ['condicion', 'Condición', 'opcion', 'Venta', 70, true, true, true],
  ['descripcion', 'Descripción comercial', 'texto_largo', 'Venta', 80, false, false, true],
])

export function camposPreconfigurados(tipo: TipoDeOrigen): readonly CampoPreconfigurado[] {
  return tipo === 'subasta' ? DE_SUBASTA : MANUAL
}

// Las capacidades del flujo que nacen encendidas. `aduana` sólo en subasta.
const REGLAS_COMUNES = [
  'logistica',
  'alerta_demora',
  'vitrina_web',
  'portal_cliente',
  'transporte',
  'contenedor',
  'gastos',
  'pagos',
  'esperas',
] as const

export function reglasPreconfiguradas(tipo: TipoDeOrigen): readonly string[] {
  return tipo === 'subasta' ? [...REGLAS_COMUNES, 'aduana'] : REGLAS_COMUNES
}

// «17 campos» o «8 campos»: lo que el alta le dice a la persona antes de crear.
export function resumenDePreconfiguracion(tipo: TipoDeOrigen): string {
  const cantidad = camposPreconfigurados(tipo).length
  const grupos = [...new Set(camposPreconfigurados(tipo).map((campo) => campo.grupo))]
  const base = `Nace con ${cantidad} campos (grupos ${grupos.join(' y ')}) y su flujo de logística, sin fases todavía.`
  return tipo === 'subasta'
    ? `${base} Cada campo se llena desde apibara y el flujo trae la regla de aduana.`
    : base
}
