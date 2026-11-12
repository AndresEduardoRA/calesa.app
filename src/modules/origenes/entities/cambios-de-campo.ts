// Lo que cambia una edición de un campo del layout: sólo viaja lo que la persona tocó, y algunos
// cambios pueden tocar datos ya cargados.
import {
  mismasOpciones,
  mismoValorDefecto,
  necesitaVistaPrevia as necesitaVistaPreviaDelMotor,
  opcionesQuitadas as opcionesQuitadasDelMotor,
} from '@/shared/lib/campos'
import type { Json } from '@/shared/types/database.types'
import type { CampoDeLayout, OpcionDeCampo, TipoDeCampo, ValorDefecto } from './campo'

export type CambiosDeCampo = Partial<{
  etiqueta: string
  tipo: TipoDeCampo
  opciones: OpcionDeCampo[]
  requerido: boolean
  grupo: string | null
  enTarjeta: boolean
  filtrable: boolean
  publicoWeb: boolean
  claveApibara: string | null
  activo: boolean
  principal: boolean
  valorDefecto: ValorDefecto | null
  // El rango (9-2); null quita el límite.
  minimo: number | null
  maximo: number | null
}>

// Los cambios que viajan tal cual, con su columna en la base. `opciones` (sin lo que no es clave ni etiqueta) va aparte.
const COLUMNA_DE = {
  etiqueta: 'etiqueta',
  tipo: 'tipo',
  requerido: 'requerido',
  grupo: 'grupo',
  enTarjeta: 'en_tarjeta',
  filtrable: 'filtrable',
  publicoWeb: 'publico_web',
  claveApibara: 'clave_apibara',
  activo: 'activo',
  principal: 'principal',
  valorDefecto: 'valor_defecto',
  minimo: 'minimo',
  maximo: 'maximo',
} as const satisfies Record<Exclude<keyof CambiosDeCampo, 'opciones'>, string>

type ClaveTalCual = keyof typeof COLUMNA_DE
const CLAVES_TAL_CUAL = Object.keys(COLUMNA_DE) as ClaveTalCual[]

// Lo que viaja a `origen_campo_guardar()` (columnas de la base). Un valor `undefined` no viaja:
// la base no lo toca; un `null` explícito vacía la columna.
export function cambiosComoColumnas(cambios: CambiosDeCampo): Record<string, Json> {
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
  'enTarjeta',
  'filtrable',
  'publicoWeb',
  'claveApibara',
  'activo',
  'principal',
  'minimo',
  'maximo',
] as const satisfies readonly (keyof CambiosDeCampo & keyof CampoDeLayout)[]

function copiarSiCambio<K extends (typeof CLAVES_SIMPLES)[number]>(
  cambios: CambiosDeCampo,
  campo: CampoDeLayout,
  formulario: Required<CambiosDeCampo>,
  clave: K,
): void {
  if (formulario[clave] !== campo[clave]) cambios[clave] = formulario[clave]
}

// Sólo lo que la persona cambió respecto de lo guardado: así una edición no pisa lo que otra
// persona tocó en el mismo campo mientras tanto.
export function cambiosRespectoDe(
  campo: CampoDeLayout,
  formulario: Required<CambiosDeCampo>,
): CambiosDeCampo {
  const cambios: CambiosDeCampo = {}
  for (const clave of CLAVES_SIMPLES) copiarSiCambio(cambios, campo, formulario, clave)
  if (!mismasOpciones(formulario.opciones, campo.opciones)) cambios.opciones = formulario.opciones
  if (!mismoValorDefecto(formulario.valorDefecto, campo.valorDefecto)) {
    cambios.valorDefecto = formulario.valorDefecto
  }
  return cambios
}

// Las claves de las opciones que el cambio saca.
export function opcionesQuitadas(campo: CampoDeLayout, cambios: CambiosDeCampo): OpcionDeCampo[] {
  return opcionesQuitadasDelMotor(campo, cambios)
}

// ¿Hace falta contar vehículos antes de guardar? Cambiar el tipo, volver requerido o sacar una
// opción pueden tocar datos que ya existen. Desactivar no: el dato se conserva y se deshace.
export function necesitaVistaPrevia(campo: CampoDeLayout, cambios: CambiosDeCampo): boolean {
  return necesitaVistaPreviaDelMotor(campo, cambios)
}
