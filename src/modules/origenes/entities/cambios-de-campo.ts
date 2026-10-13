// Lo que cambia una edición de un campo del layout: sólo viaja lo que la persona tocó, y algunos
// cambios pueden tocar datos ya cargados.
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
  valorDefecto: ValorDefecto | null
}>

// Lo que viaja a `origen_campo_guardar()` (columnas de la base). Un valor `undefined` no viaja:
// la base no lo toca; un `null` explícito vacía la columna.
export function cambiosComoColumnas(cambios: CambiosDeCampo): Record<string, Json> {
  const columnas: Record<string, Json> = {}
  if (cambios.etiqueta !== undefined) columnas['etiqueta'] = cambios.etiqueta
  if (cambios.tipo !== undefined) columnas['tipo'] = cambios.tipo
  if (cambios.opciones !== undefined) {
    columnas['opciones'] = cambios.opciones.map(({ clave, etiqueta }) => ({ clave, etiqueta }))
  }
  if (cambios.requerido !== undefined) columnas['requerido'] = cambios.requerido
  if (cambios.grupo !== undefined) columnas['grupo'] = cambios.grupo
  if (cambios.enTarjeta !== undefined) columnas['en_tarjeta'] = cambios.enTarjeta
  if (cambios.filtrable !== undefined) columnas['filtrable'] = cambios.filtrable
  if (cambios.publicoWeb !== undefined) columnas['publico_web'] = cambios.publicoWeb
  if (cambios.claveApibara !== undefined) columnas['clave_apibara'] = cambios.claveApibara
  if (cambios.activo !== undefined) columnas['activo'] = cambios.activo
  if (cambios.valorDefecto !== undefined) columnas['valor_defecto'] = cambios.valorDefecto
  return columnas
}

function mismasOpciones(a: readonly OpcionDeCampo[], b: readonly OpcionDeCampo[]): boolean {
  return (
    a.length === b.length &&
    a.every((opcion, i) => {
      const otra = b[i]
      return otra !== undefined && opcion.clave === otra.clave && opcion.etiqueta === otra.etiqueta
    })
  )
}

function mismoValorDefecto(a: ValorDefecto | null, b: ValorDefecto | null): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((clave, i) => clave === b[i])
  }
  return a === b
}

// Sólo lo que la persona cambió respecto de lo guardado: así una edición no pisa lo que otra
// persona tocó en el mismo campo mientras tanto.
export function cambiosRespectoDe(
  campo: CampoDeLayout,
  formulario: Required<CambiosDeCampo>,
): CambiosDeCampo {
  const cambios: CambiosDeCampo = {}
  if (formulario.etiqueta !== campo.etiqueta) cambios.etiqueta = formulario.etiqueta
  if (formulario.tipo !== campo.tipo) cambios.tipo = formulario.tipo
  if (!mismasOpciones(formulario.opciones, campo.opciones)) cambios.opciones = formulario.opciones
  if (formulario.requerido !== campo.requerido) cambios.requerido = formulario.requerido
  if (formulario.grupo !== campo.grupo) cambios.grupo = formulario.grupo
  if (formulario.enTarjeta !== campo.enTarjeta) cambios.enTarjeta = formulario.enTarjeta
  if (formulario.filtrable !== campo.filtrable) cambios.filtrable = formulario.filtrable
  if (formulario.publicoWeb !== campo.publicoWeb) cambios.publicoWeb = formulario.publicoWeb
  if (formulario.claveApibara !== campo.claveApibara) cambios.claveApibara = formulario.claveApibara
  if (formulario.activo !== campo.activo) cambios.activo = formulario.activo
  if (!mismoValorDefecto(formulario.valorDefecto, campo.valorDefecto)) {
    cambios.valorDefecto = formulario.valorDefecto
  }
  return cambios
}

// Las claves de las opciones que el cambio saca.
export function opcionesQuitadas(campo: CampoDeLayout, cambios: CambiosDeCampo): OpcionDeCampo[] {
  if (!cambios.opciones) {
    return []
  }
  const quedan = new Set(cambios.opciones.map((opcion) => opcion.clave))
  return campo.opciones.filter((opcion) => !quedan.has(opcion.clave))
}

// ¿Hace falta contar vehículos antes de guardar? Cambiar el tipo, volver requerido o sacar una
// opción pueden tocar datos que ya existen. Desactivar no: el dato se conserva y se deshace.
export function necesitaVistaPrevia(campo: CampoDeLayout, cambios: CambiosDeCampo): boolean {
  if (cambios.tipo !== undefined && cambios.tipo !== campo.tipo) {
    return true
  }
  if (cambios.requerido === true && !campo.requerido) {
    return true
  }
  return opcionesQuitadas(campo, cambios).length > 0
}
