import 'server-only'
import { ENTRADAS_VACIAS, entradasDelPedido } from '../../entities/entradas'
import { argumentosDeEvaluar, resultadoDeEvaluar } from '../../entities/pedido-de-recalculo'
import type { RecalculadorAlAbrir } from '../../entities/repositorios-de-hoja'
import { createClient } from '@/shared/lib/supabase/server'

// El primer cálculo de la hoja, con las entradas vacías, junto con la lectura de la hoja: así llega dibujada con sus valores y el navegador no pide nada al abrir.
// Una sola llamada a `cotizacion_evaluar()`; la segunda sólo existe si la base rechazó el vehículo de la URL (42501 o de otro origen) y se vuelve a calcular sin él.
export const recalcularAlAbrir: RecalculadorAlAbrir = async ({ origenId, vehiculoId }) => {
  const supabase = await createClient()
  const entradas = entradasDelPedido(ENTRADAS_VACIAS)
  const evaluar = async (vehiculo: string | null) =>
    resultadoDeEvaluar(
      await supabase.rpc(
        'cotizacion_evaluar',
        argumentosDeEvaluar({ origenId, vehiculoId: vehiculo, entradas, modoTc: null }),
      ),
    )
  const primero = await evaluar(vehiculoId)
  const rechazado =
    !primero.ok && (primero.error.codigo === 'sin_permiso' || primero.error.codigo === 'regla')
  if (vehiculoId === null || !rechazado) {
    return { resultado: primero, vehiculoSoltado: false }
  }
  const sinVehiculo = await evaluar(null)
  return sinVehiculo.ok
    ? { resultado: sinVehiculo, vehiculoSoltado: true }
    : { resultado: primero, vehiculoSoltado: false }
}
