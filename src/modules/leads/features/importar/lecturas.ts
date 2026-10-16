import 'server-only'
import type { Resultado } from '@/shared/lib/errores'
import { leerContextoDeAlta, leerLayoutDeLeads, repositorioDeImportacion } from '../../composicion'
import type { ContextoDeAlta } from '../../entities/alta'
import type { CampoDeLead } from '../../entities/campo'
import type { ImportacionReciente } from '../../entities/importacion/deshacer'

export type DatosDeImportacion = {
  // Todo el layout: la importación ofrece los activos.
  campos: CampoDeLead[]
  // Los orígenes activos, el último origen de la persona y el código de país de la empresa.
  contexto: ContextoDeAlta
}

// Lo que el asistente necesita para emparejar y validar: el layout de hoy y el contexto del alta.
export async function leerDatosDeImportacion(): Promise<Resultado<DatosDeImportacion>> {
  const [layout, contexto] = await Promise.all([leerLayoutDeLeads(), leerContextoDeAlta()])
  if (!layout.ok) {
    return layout
  }
  if (!contexto.ok) {
    return contexto
  }
  return { ok: true, data: { campos: layout.data, contexto: contexto.data } }
}

// «Tus importaciones recientes»: las propias de las últimas 24 h, con números y nada del archivo.
export async function leerImportacionesRecientes(): Promise<Resultado<ImportacionReciente[]>> {
  return repositorioDeImportacion.recientes()
}
