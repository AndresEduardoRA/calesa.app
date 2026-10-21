import 'server-only'
import type { Resultado } from '@/shared/lib/errores'
import {
  leerCatalogosDeLead,
  leerContextoDeAlta,
  leerLayoutDeLeads,
  repositorioDeImportacion,
} from '../../composicion'
import {
  contextoDeImportacionDesde,
  type ContextoDeImportacion,
} from '../../entities/importacion/contexto'
import type { CampoDeLead } from '../../entities/campo'
import type { ImportacionReciente } from '../../entities/importacion/deshacer'

export type DatosDeImportacion = {
  // Todo el layout: la importación ofrece los activos.
  campos: CampoDeLead[]
  // Los orígenes y tipos activos con su clave, el origen que propone el alta y el código de país de la empresa.
  contexto: ContextoDeImportacion
}

// Lo que el asistente necesita para emparejar y validar: el layout de hoy, el contexto del alta y las claves de los catálogos (una celda
// nombra un origen o un tipo por nombre o por clave, y el alta ya no trae la clave).
export async function leerDatosDeImportacion(): Promise<Resultado<DatosDeImportacion>> {
  const [layout, contexto, catalogos] = await Promise.all([
    leerLayoutDeLeads(),
    leerContextoDeAlta(),
    leerCatalogosDeLead(),
  ])
  if (!layout.ok) {
    return layout
  }
  if (!contexto.ok) {
    return contexto
  }
  if (!catalogos.ok) {
    return catalogos
  }
  return {
    ok: true,
    data: {
      campos: layout.data,
      contexto: contextoDeImportacionDesde(contexto.data, catalogos.data),
    },
  }
}

// «Tus importaciones recientes»: las propias de las últimas 24 h, con números y nada del archivo.
export async function leerImportacionesRecientes(): Promise<Resultado<ImportacionReciente[]>> {
  return repositorioDeImportacion.recientes()
}
