import 'server-only'
import { getOrigenes } from '@/modules/origenes'
import { ok, type Resultado } from '@/shared/lib/errores'
import {
  leerClientesDeCotizaciones,
  leerCotizacionesAExportar,
  leerTitulosDeVehiculos,
  type ClienteDelFlujo,
} from '../../composicion'
import { etiquetaDeArchivo, type FilaDeCotizacionAExportar } from '../../entities/exportacion'
import {
  encabezadosDeCotizaciones,
  filaDeCotizacion,
  type ContextoDeCotizaciones,
} from './columnas-de-cotizaciones'
import type { Fuente } from './fuente-de-leads'

type EntradaDeLaFuente = {
  cliente: ClienteDelFlujo
  // Sin origen, todas las que se ven.
  origenId: string | null
  zona: string
  monedaBase: string | null
  // `leads.ver` efectivo: sin él no se piden los nombres de los clientes (como la pantalla de cotizaciones), y aun con él decide la RLS.
  conClientes: boolean
}

const distintos = (ids: readonly (string | null)[]): string[] => [
  ...new Set(ids.filter((id): id is string => id !== null)),
]

// Las cotizaciones de «exportar todo» (9.05-2c): los orígenes se leen dentro del pedido (no sacan datos de nadie), las filas y los nombres con el
// cliente del flujo. Los nombres se traen por página y se olvidan en la siguiente (memoria de una página, no de la exportación). Un origen que no
// está da `null` (`exportarTodo` responde lo mismo que a uno sin cotizaciones visibles: no dice si existe); los inactivos exportan.
export async function fuenteDeCotizaciones(
  entrada: EntradaDeLaFuente,
): Promise<Resultado<Fuente<FilaDeCotizacionAExportar> | null>> {
  const { cliente, origenId, zona, monedaBase, conClientes } = entrada
  const origenes = await getOrigenes(true)
  if (!origenes.ok) {
    return origenes
  }
  const origen = origenId === null ? undefined : origenes.data.find((uno) => uno.id === origenId)
  if (origenId !== null && origen === undefined) {
    return ok(null)
  }
  const clientes = new Map<string, string>()
  const vehiculos = new Map<string, string>()
  const contexto: ContextoDeCotizaciones = {
    origenes: new Map(origenes.data.map((uno) => [uno.id, uno.nombre])),
    clientes,
    vehiculos,
    monedaBase,
    zona,
  }
  return ok({
    lector: leerCotizacionesAExportar(cliente, origenId),
    columnas: {
      encabezados: encabezadosDeCotizaciones(contexto),
      fila: (fila) => filaDeCotizacion(fila, contexto),
      async antesDeEscribir(filas) {
        clientes.clear()
        vehiculos.clear()
        if (conClientes) {
          const leidos = await leerClientesDeCotizaciones(
            cliente,
            distintos(filas.map((fila) => fila.leadId)),
          )
          if (!leidos.ok) {
            return leidos
          }
          for (const [id, nombre] of leidos.data) {
            clientes.set(id, nombre)
          }
        }
        const titulos = await leerTitulosDeVehiculos(
          cliente,
          distintos(filas.map((fila) => fila.vehiculoId)),
        )
        if (!titulos.ok) {
          return titulos
        }
        for (const [id, titulo] of titulos.data) {
          vehiculos.set(id, titulo)
        }
        return ok(undefined)
      },
    },
    ...(origen === undefined ? {} : { etiqueta: etiquetaDeArchivo(origen.nombre, origen.id) }),
  })
}
