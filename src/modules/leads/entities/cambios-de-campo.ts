// Lo que cambia una edición de un campo de los leads: sólo viaja lo que la persona tocó, y algunos
// cambios pueden tocar datos ya cargados o exponerlos.
import {
  mismasOpciones,
  mismoValorDefecto,
  necesitaVistaPrevia as necesitaVistaPreviaDelMotor,
  type CambiosComunes,
  type TipoDeCampoDeLead,
} from '@/shared/lib/campos'
import type { Json } from '@/shared/types/database.types'
import type { CampoDeLead, DatoDeLaEmpresa } from './campo'

export type CambiosDeCampoDeLead = Omit<CambiosComunes, 'tipo'> &
  Partial<{
    // Un lead no lleva VIN ni lote.
    tipo: TipoDeCampoDeLead
    enTabla: boolean
    filtrable: boolean
    soloCartera: boolean
    valorDefectoEmpresa: DatoDeLaEmpresa | null
  }>

// Los cambios que viajan tal cual, con su columna en la base. `opciones` (sin lo que no es clave ni etiqueta) va aparte.
const COLUMNA_DE = {
  etiqueta: 'etiqueta',
  tipo: 'tipo',
  requerido: 'requerido',
  grupo: 'grupo',
  enTabla: 'en_tabla',
  filtrable: 'filtrable',
  soloCartera: 'solo_cartera',
  activo: 'activo',
  valorDefecto: 'valor_defecto',
  valorDefectoEmpresa: 'valor_defecto_empresa',
  minimo: 'minimo',
  maximo: 'maximo',
} as const satisfies Record<Exclude<keyof CambiosDeCampoDeLead, 'opciones'>, string>

type ClaveTalCual = keyof typeof COLUMNA_DE
const CLAVES_TAL_CUAL = Object.keys(COLUMNA_DE) as ClaveTalCual[]

// Lo que viaja a `lead_campo_guardar()` (columnas de la base). Un valor `undefined` no viaja: la
// base no lo toca; un `null` explícito vacía la columna.
export function cambiosComoColumnas(cambios: CambiosDeCampoDeLead): Record<string, Json> {
  const columnas: Record<string, Json> = {}
  for (const clave of CLAVES_TAL_CUAL) {
    const valor = cambios[clave]
    if (valor !== undefined) columnas[COLUMNA_DE[clave]] = valor
  }
  if (cambios.opciones !== undefined) {
    columnas['opciones'] = cambios.opciones.map(({ clave, etiqueta }) => ({ clave, etiqueta }))
  }
  return columnas
}

// Las que se comparan con `!==`; opciones y valor por defecto tienen su comparación.
const CLAVES_SIMPLES = [
  'etiqueta',
  'tipo',
  'requerido',
  'grupo',
  'enTabla',
  'filtrable',
  'soloCartera',
  'activo',
  'valorDefectoEmpresa',
  'minimo',
  'maximo',
] as const satisfies readonly (keyof CambiosDeCampoDeLead & keyof CampoDeLead)[]

function copiarSiCambio<K extends (typeof CLAVES_SIMPLES)[number]>(
  cambios: CambiosDeCampoDeLead,
  campo: CampoDeLead,
  formulario: Required<CambiosDeCampoDeLead>,
  clave: K,
): void {
  if (formulario[clave] !== campo[clave]) cambios[clave] = formulario[clave]
}

// Sólo lo que la persona cambió respecto de lo guardado: así una edición no pisa lo que otra
// persona tocó en el mismo campo mientras tanto.
export function cambiosRespectoDe(
  campo: CampoDeLead,
  formulario: Required<CambiosDeCampoDeLead>,
): CambiosDeCampoDeLead {
  const cambios: CambiosDeCampoDeLead = {}
  for (const clave of CLAVES_SIMPLES) copiarSiCambio(cambios, campo, formulario, clave)
  if (!mismasOpciones(formulario.opciones, campo.opciones)) cambios.opciones = formulario.opciones
  if (!mismoValorDefecto(formulario.valorDefecto, campo.valorDefecto)) {
    cambios.valorDefecto = formulario.valorDefecto
  }
  return cambios
}

// ¿Hace falta contar leads antes de guardar? Cambiar el tipo, volver requerido o sacar una opción
// pueden tocar datos que ya existen; y pasar un campo de «solo la cartera» a «quien ve el lead» los
// expone a quien hoy no los recibe.
export function necesitaVistaPrevia(campo: CampoDeLead, cambios: CambiosDeCampoDeLead): boolean {
  return (
    necesitaVistaPreviaDelMotor(campo, cambios) ||
    (cambios.soloCartera === false && campo.soloCartera)
  )
}
