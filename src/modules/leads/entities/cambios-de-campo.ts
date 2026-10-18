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

// Lo que viaja a `lead_campo_guardar()` (columnas de la base). Un valor `undefined` no viaja: la
// base no lo toca; un `null` explícito vacía la columna.
export function cambiosComoColumnas(cambios: CambiosDeCampoDeLead): Record<string, Json> {
  const columnas: Record<string, Json> = {}
  if (cambios.etiqueta !== undefined) columnas['etiqueta'] = cambios.etiqueta
  if (cambios.tipo !== undefined) columnas['tipo'] = cambios.tipo
  if (cambios.opciones !== undefined) {
    columnas['opciones'] = cambios.opciones.map(({ clave, etiqueta }) => ({ clave, etiqueta }))
  }
  if (cambios.requerido !== undefined) columnas['requerido'] = cambios.requerido
  if (cambios.grupo !== undefined) columnas['grupo'] = cambios.grupo
  if (cambios.enTabla !== undefined) columnas['en_tabla'] = cambios.enTabla
  if (cambios.filtrable !== undefined) columnas['filtrable'] = cambios.filtrable
  if (cambios.soloCartera !== undefined) columnas['solo_cartera'] = cambios.soloCartera
  if (cambios.activo !== undefined) columnas['activo'] = cambios.activo
  if (cambios.valorDefecto !== undefined) columnas['valor_defecto'] = cambios.valorDefecto
  if (cambios.valorDefectoEmpresa !== undefined) {
    columnas['valor_defecto_empresa'] = cambios.valorDefectoEmpresa
  }
  return columnas
}

// Sólo lo que la persona cambió respecto de lo guardado: así una edición no pisa lo que otra
// persona tocó en el mismo campo mientras tanto.
export function cambiosRespectoDe(
  campo: CampoDeLead,
  formulario: Required<CambiosDeCampoDeLead>,
): CambiosDeCampoDeLead {
  const cambios: CambiosDeCampoDeLead = {}
  if (formulario.etiqueta !== campo.etiqueta) cambios.etiqueta = formulario.etiqueta
  if (formulario.tipo !== campo.tipo) cambios.tipo = formulario.tipo
  if (!mismasOpciones(formulario.opciones, campo.opciones)) cambios.opciones = formulario.opciones
  if (formulario.requerido !== campo.requerido) cambios.requerido = formulario.requerido
  if (formulario.grupo !== campo.grupo) cambios.grupo = formulario.grupo
  if (formulario.enTabla !== campo.enTabla) cambios.enTabla = formulario.enTabla
  if (formulario.filtrable !== campo.filtrable) cambios.filtrable = formulario.filtrable
  if (formulario.soloCartera !== campo.soloCartera) cambios.soloCartera = formulario.soloCartera
  if (formulario.activo !== campo.activo) cambios.activo = formulario.activo
  if (!mismoValorDefecto(formulario.valorDefecto, campo.valorDefecto)) {
    cambios.valorDefecto = formulario.valorDefecto
  }
  if (formulario.valorDefectoEmpresa !== campo.valorDefectoEmpresa) {
    cambios.valorDefectoEmpresa = formulario.valorDefectoEmpresa
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
