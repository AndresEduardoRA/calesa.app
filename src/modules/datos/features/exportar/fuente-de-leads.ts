import 'server-only'
import { leerCatalogosDeLead, leerLayoutDeLeads } from '@/modules/leads'
import { ok, type Resultado } from '@/shared/lib/errores'
import { leerLeadsAExportar, leerNombresDePersonas, type ClienteDelFlujo } from '../../composicion'
import type {
  ColumnasDeExportacion,
  FilaDeLeadAExportar,
  LectorDeExportacion,
} from '../../entities/exportacion'
import { encabezadosDeLeads, filaDeLead, type ContextoDeLeads } from './columnas-de-leads'

export type Fuente<Fila> = {
  lector: LectorDeExportacion<Fila>
  columnas: ColumnasDeExportacion<Fila>
  // Lo que distingue el nombre del archivo (el origen de los vehículos).
  etiqueta?: string
}

type EntradaDeLaFuente = {
  cliente: ClienteDelFlujo
  zona: string
  codigoDePais: string | null
  conNumeroGlobal: boolean
}

// Los leads de «exportar todo»: el layout y los catálogos se leen dentro del pedido (no sacan datos de nadie), las filas con el cliente del
// flujo. Los nombres de los dueños se traen por página, sólo los que faltan (nunca uno por fila).
export async function fuenteDeLeads(
  entrada: EntradaDeLaFuente,
): Promise<Resultado<Fuente<FilaDeLeadAExportar>>> {
  const { cliente, zona, codigoDePais, conNumeroGlobal } = entrada
  const [layout, catalogos] = await Promise.all([leerLayoutDeLeads(), leerCatalogosDeLead()])
  if (!layout.ok) {
    return layout
  }
  if (!catalogos.ok) {
    return catalogos
  }
  const duenos = new Map<string, string>()
  const contexto: ContextoDeLeads = {
    campos: layout.data,
    tipos: new Map(catalogos.data.tipos.map((tipo) => [tipo.id, tipo.nombre])),
    origenes: new Map(catalogos.data.origenes.map((origen) => [origen.id, origen.nombre])),
    duenos,
    codigoDePais,
    zona,
    conNumeroGlobal,
  }
  return ok({
    lector: leerLeadsAExportar(cliente),
    columnas: {
      encabezados: encabezadosDeLeads(contexto),
      fila: (fila) => filaDeLead(fila, contexto),
      async antesDeEscribir(filas) {
        const faltan = [
          ...new Set(
            filas.flatMap((fila) =>
              fila.duenoId !== null && !duenos.has(fila.duenoId) ? [fila.duenoId] : [],
            ),
          ),
        ]
        const nombres = await leerNombresDePersonas(cliente, faltan)
        if (!nombres.ok) {
          return nombres
        }
        for (const [id, nombre] of nombres.data) {
          duenos.set(id, nombre)
        }
        return ok(undefined)
      },
    },
  })
}
