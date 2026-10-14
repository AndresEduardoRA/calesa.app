// Lo que nace con un origen según su tipo: espejo de `origen_preconfigurar_campos()` y de
// `origen_crear_flujo()` (supabase/migrations/…000300_triggers.sql y …20261014000200_apibara.sql).
// Sirve sólo para mostrar qué va a nacer antes de crearlo: la base es la que crea.
// `preconfiguraciones.test.ts` lee el SQL y falla si las dos listas divergen.
import { CATALOGO_APIBARA, GRUPOS_DEL_CATALOGO } from './catalogo-apibara'
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

// En subasta nace el catálogo de apibara entero (los 17 campos de siempre y cada dato normalizado).
const DE_SUBASTA: CampoPreconfigurado[] = CATALOGO_APIBARA.map((dato) => ({
  clave: dato.clave,
  etiqueta: dato.etiqueta,
  tipo: dato.tipo,
  grupo: dato.grupo,
  orden: dato.orden,
  enTarjeta: dato.enTarjeta,
  filtrable: dato.filtrable,
  publicoWeb: dato.publicoWeb,
  ...(dato.claveApibara === null ? {} : { claveApibara: dato.claveApibara }),
}))

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

// «106 campos (…)» o «8 campos»: lo que el alta le dice a la persona antes de crear.
export function resumenDePreconfiguracion(tipo: TipoDeOrigen): string {
  const cantidad = camposPreconfigurados(tipo).length
  if (tipo === 'subasta') {
    return (
      `Nace con ${cantidad} campos en ${GRUPOS_DEL_CATALOGO.length} secciones y su flujo de logística, sin fases todavía. ` +
      'Cada dato que devuelve apibara tiene su campo, encendido: después apagas los que no uses. ' +
      'El flujo trae la regla de aduana.'
    )
  }
  const grupos = [...new Set(camposPreconfigurados(tipo).map((campo) => campo.grupo))]
  return `Nace con ${cantidad} campos (grupos ${grupos.join(' y ')}) y su flujo de logística, sin fases todavía.`
}
