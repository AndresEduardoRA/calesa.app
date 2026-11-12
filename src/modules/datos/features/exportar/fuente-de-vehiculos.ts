import 'server-only'
import { leerFasesDeOrigen } from '@/modules/flujos'
import { getOrigenes, leerLayout } from '@/modules/origenes'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { leerVehiculosAExportar, type ClienteDelFlujo } from '../../composicion'
import { etiquetaDeArchivo, type FilaDeVehiculoAExportar } from '../../entities/exportacion'
import {
  contextoDeVehiculos,
  encabezadosDeVehiculos,
  filaDeVehiculo,
} from './columnas-de-vehiculos'
import type { Fuente } from './fuente-de-leads'

type EntradaDeLaFuente = {
  cliente: ClienteDelFlujo
  origenId: string
  zona: string
}

// Los vehículos de un origen para «exportar todo» (9.05-2b): el origen, su layout y sus fases se leen dentro del pedido (no sacan datos de nadie:
// todo `authenticated` los ve), las filas con el cliente del flujo. Los orígenes inactivos también: guardan vehículos que la empresa se puede
// llevar. Un origen que no está da `no_encontrado`, la misma respuesta que uno sin vehículos visibles: no dice si existe.
export async function fuenteDeVehiculos(
  entrada: EntradaDeLaFuente,
): Promise<Resultado<Fuente<FilaDeVehiculoAExportar>>> {
  const { cliente, origenId, zona } = entrada
  const [origenes, layout, fases] = await Promise.all([
    getOrigenes(true),
    leerLayout(origenId, { conUso: false }),
    leerFasesDeOrigen(origenId),
  ])
  if (!origenes.ok) {
    return origenes
  }
  const origen = origenes.data.find((uno) => uno.id === origenId)
  if (origen === undefined) {
    return fallo('no_encontrado', 'No encontramos ese origen.')
  }
  if (!layout.ok) {
    return layout
  }
  if (!fases.ok) {
    return fases
  }
  const contexto = contextoDeVehiculos({
    tipo: origen.tipo,
    layout: layout.data,
    fases: fases.data,
    zona,
  })
  return ok({
    lector: leerVehiculosAExportar(cliente, origenId),
    columnas: {
      encabezados: encabezadosDeVehiculos(contexto),
      fila: (fila) => filaDeVehiculo(fila, contexto),
    },
    etiqueta: etiquetaDeArchivo(origen.nombre, origen.id),
  })
}
