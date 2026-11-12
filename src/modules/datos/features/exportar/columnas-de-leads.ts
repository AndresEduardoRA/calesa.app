// Cómo se escribe un lead en el archivo de «exportar todo» (9.05-2). Puro: la fila ya viene de `datos_exportar_leads()` con la sesión de quien
// exporta (la base decidió qué filas, qué teléfono y qué campos ve); acá sólo se dice cada valor, con las reglas de la exportación propia de
// `leads` (una sola por tipo de campo).
//
// Columnas: «N.º» (sólo con `leads.numero_global.ver`), Nombre, Teléfono, Tipo, Origen, Dueño, Creado, Último seguimiento y los campos activos del
// layout, con su etiqueta y en su orden. No lleva «N.º propio»: la función no lo trae. Las fechas, en la zona de la empresa (`AAAA-MM-DDTHH:mm`).
import {
  ENCABEZADO_DEL_NUMERO_GLOBAL,
  camposDeExportacion,
  telefonoDeExportacion,
  valorDeExportacion,
  type CampoDeLead,
} from '@/modules/leads'
import type { Celda } from '@/shared/lib/csv/escribir'
import { localDeInstante } from '@/shared/lib/fechas'
import type { FilaDeLeadAExportar } from '../../entities/exportacion'

export const ENCABEZADOS_FIJOS_DE_LEADS = [
  'Nombre',
  'Teléfono',
  'Tipo',
  'Origen',
  'Dueño',
  'Creado',
  'Último seguimiento',
] as const

export type ContextoDeLeads = {
  // El layout entero: acá se quedan los activos, en su orden.
  campos: readonly CampoDeLead[]
  // Nombre por id, también de los apagados (un lead puede conservar uno desactivado).
  tipos: ReadonlyMap<string, string>
  origenes: ReadonlyMap<string, string>
  // Nombre de cada dueño por id: lo llena la página antes de escribirse (`antesDeEscribir`).
  duenos: ReadonlyMap<string, string>
  codigoDePais: string | null
  zona: string
  conNumeroGlobal: boolean
}

export function encabezadosDeLeads(contexto: ContextoDeLeads): string[] {
  return [
    ...(contexto.conNumeroGlobal ? [ENCABEZADO_DEL_NUMERO_GLOBAL] : []),
    ...ENCABEZADOS_FIJOS_DE_LEADS,
    ...camposDeExportacion(contexto.campos).map((campo) => campo.etiqueta),
  ]
}

const fecha = (iso: string | null, zona: string): string =>
  iso === null ? '' : localDeInstante(iso, { zona })

// El teléfono de la cartera sale completo, como en la exportación propia; el de un lead ajeno, tal cual lo dio la base (enmascarado).
function telefono(fila: FilaDeLeadAExportar, codigoDePais: string | null): string {
  if (fila.telefono === null) {
    return ''
  }
  return fila.telefonoVisible ? telefonoDeExportacion(fila.telefono, codigoDePais) : fila.telefono
}

export function filaDeLead(fila: FilaDeLeadAExportar, contexto: ContextoDeLeads): Celda[] {
  return [
    ...(contexto.conNumeroGlobal ? [fila.numero ?? ''] : []),
    fila.nombre,
    telefono(fila, contexto.codigoDePais),
    contexto.tipos.get(fila.tipoLeadId) ?? '',
    fila.origenLeadId === null ? '' : (contexto.origenes.get(fila.origenLeadId) ?? ''),
    fila.duenoId === null ? '' : (contexto.duenos.get(fila.duenoId) ?? ''),
    fecha(fila.creadoEn, contexto.zona),
    fecha(fila.ultimoSeguimientoEn, contexto.zona),
    ...camposDeExportacion(contexto.campos).map((campo) =>
      valorDeExportacion(campo, fila.atributos[campo.clave], contexto.zona),
    ),
  ]
}
