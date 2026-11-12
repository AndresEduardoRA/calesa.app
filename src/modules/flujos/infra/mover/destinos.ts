import 'server-only'
import { errorDePostgrest, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  destinosDeSalidas,
  destinosIniciales,
  type DestinoDeMover,
} from '../../entities/mover/para-mover'

// A dónde puede ir una unidad: las salidas de su fase (`fases_transiciones`, índice por `de_fase_id`) o, sin fase, las fases iniciales activas de su flujo. Son configuración (un puñado de filas por
// fase): se pide `tope + 1` y, si llega, `hayMas` lo dice; la lista no se corta en silencio. Cualquier cuenta con sesión lee estas tablas (policies `using (true)`); quién puede mover lo decide la base.
type Lectura = Resultado<{ destinos: DestinoDeMover[]; hayMas: boolean }>

function acotar(destinos: DestinoDeMover[], tope: number): Lectura {
  return { ok: true, data: { destinos: destinos.slice(0, tope), hayMas: destinos.length > tope } }
}

export async function leerDestinosDeBase(pedido: {
  origenId: string
  faseId: string | null
  tope: number
}): Promise<Lectura> {
  const supabase = await createClient()
  const { origenId, faseId, tope } = pedido
  if (faseId !== null) {
    const { data, error } = await supabase
      .from('fases_transiciones')
      .select(
        'accion, nota_obligatoria, destino:fases!fases_transiciones_a_fase_id_fkey!inner(id, nombre, color, orden, activa)',
      )
      .eq('de_fase_id', faseId)
      .eq('destino.activa', true)
      .limit(tope + 1)
    if (error) return { ok: false, error: errorDePostgrest(error) }
    const leidas = destinosDeSalidas(data)
    return leidas.ok ? acotar(leidas.data, tope) : leidas
  }
  const { data, error } = await supabase
    .from('fases')
    .select('id, nombre, color, orden, flujo:flujos!fases_flujo_id_fkey!inner(origen_id, ambito)')
    .eq('flujo.origen_id', origenId)
    .eq('flujo.ambito', 'vehiculos')
    .eq('es_inicial', true)
    .eq('activa', true)
    .order('orden')
    .limit(tope + 1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const leidas = destinosIniciales(data)
  return leidas.ok ? acotar(leidas.data, tope) : leidas
}
