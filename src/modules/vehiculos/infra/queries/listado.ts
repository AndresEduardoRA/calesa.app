import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { armarPagina } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import type { BuscadorDeVehiculos, LectorDeVehiculo } from '../../entities/repositorios'
import { COLUMNAS_DE_VEHICULO, vehiculosDesde } from '../../entities/vehiculo'
import { aplicarCondiciones, aplicarCursor } from './condiciones'

// Una página del inventario de un origen: una sola consulta, de lo más nuevo a lo más viejo, con
// una fila de más para saber si hay otra página. Lo que ve cada quien lo decide la RLS. Bajo RLS
// los filtros sobre `atributos` no usan el GIN: la base camina el índice del listado
// (`vehiculos_origen_listado_idx`) filtrando, y corta en `tamano + 1`.
export const buscarVehiculos: BuscadorDeVehiculos = async (pedido) => {
  const { origenId, condiciones, cursor, tamano } = pedido
  const supabase = await createClient()
  const base = supabase.from('vehiculos').select(COLUMNAS_DE_VEHICULO).eq('origen_id', origenId)
  // Hacia atrás se camina al revés (lo más viejo primero) y `armarPagina` lo da vuelta.
  const haciaAtras = cursor?.sentido === 'anterior'
  const { data, error } = await aplicarCursor(aplicarCondiciones(base, condiciones), cursor)
    .order('creado_en', { ascending: haciaAtras })
    .order('id', { ascending: haciaAtras })
    .limit(tamano + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(armarPagina(vehiculosDesde(data), tamano, cursor))
}

// Un vehículo por su id. Lo que la RLS esconde, lo que está en la papelera y lo que no existe
// vuelven igual: null.
export const getVehiculo: LectorDeVehiculo = async (id) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehiculos')
    .select(COLUMNAS_DE_VEHICULO)
    .eq('id', id)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(vehiculosDesde(data)[0] ?? null)
}
