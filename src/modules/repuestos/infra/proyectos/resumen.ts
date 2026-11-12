import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_DE_ITEMS_DE_LA_HOJA } from '../../entities/nucleo/item'
import {
  COLUMNAS_DE_ITEM_DEL_RESUMEN,
  COLUMNAS_DE_PROYECTO_DE_VEHICULO,
  itemsDelResumenDesde,
  proyectoDeVehiculoDesde,
  resumirItems,
  type ProyectoDeVehiculo,
  type ResumenDeItems,
} from '../../entities/proyectos/resumen'

const NO_SE_LEYO = 'No se pudo cargar el resumen de repuestos.'

// El proyecto vivo de un vehículo (8.09-4, C1), por `repuestos_proyecto_por_vehiculo` (uno por vehículo, vivo) y con la sesión de quien mira: la RLS (`repuestos.ver`) decide.
// Nulo = no hay proyecto o no se ve: no se distingue (D49). Un id que ni es guid no se consulta.
export async function proyectoDe(
  vehiculoId: string,
): Promise<Resultado<ProyectoDeVehiculo | null>> {
  if (!z.guid().safeParse(vehiculoId).success) {
    return ok(null)
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_proyectos')
    .select(COLUMNAS_DE_PROYECTO_DE_VEHICULO)
    .eq('vehiculo_id', vehiculoId)
    .is('eliminado_en', null)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const fila = data[0]
  if (fila === undefined) {
    return ok(null)
  }
  const proyecto = proyectoDeVehiculoDesde(fila)
  return proyecto === null ? fallo('inesperado', NO_SE_LEYO) : ok(proyecto)
}

export type ResumenDeVehiculo = {
  proyecto: ProyectoDeVehiculo
  resumen: ResumenDeItems
}

// El proyecto del vehículo y sus ítems por fase (8.09-4, C2): dos lecturas chicas, la segunda de a lo sumo 201 ítems por `repuestos_items_proyecto_id_idx`. Sólo la pide la
// pestaña «Repuestos» de la ficha al abrirse. Nulo = el vehículo no tiene proyecto (o no se ve).
export async function leerResumenDeVehiculo(
  vehiculoId: string,
): Promise<Resultado<ResumenDeVehiculo | null>> {
  const proyecto = await proyectoDe(vehiculoId)
  if (!proyecto.ok || proyecto.data === null) {
    return proyecto.ok ? ok(null) : proyecto
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_items')
    .select(COLUMNAS_DE_ITEM_DEL_RESUMEN)
    .eq('proyecto_id', proyecto.data.id)
    .is('eliminado_en', null)
    .limit(TOPE_DE_ITEMS_DE_LA_HOJA + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const items = itemsDelResumenDesde(data)
  if (items === null) {
    return fallo('inesperado', NO_SE_LEYO)
  }
  return ok({ proyecto: proyecto.data, resumen: resumirItems(items, proyecto.data.cerradoEn) })
}
