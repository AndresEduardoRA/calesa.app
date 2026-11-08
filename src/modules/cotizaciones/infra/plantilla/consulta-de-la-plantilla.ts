// Las tres lecturas del editor de la plantilla de la tarjeta de un origen (4.19-3a), sobre el cliente que recibe, con la sesión de quien mira. Las policies recortan: `plantillas_tarjeta: leer` y
// `formulas: leer` dejan ver sólo los orígenes donde tiene `cotizaciones.configurar` (lo que no se ve vuelve vacío, sin distinguirlo de «no existe»); `tonos`, a todo `authenticated`.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database.types'
import { TOPE_DE_TONOS } from '../../entities/plantilla/lectura-de-la-plantilla'

type Cliente = SupabaseClient<Database>

// El borrador y la publicada: a lo sumo dos filas (`plantillas_borrador_unico` y `plantillas_publicada_unica`, índices únicos parciales por `origen_id`).
export function consultaDeLasPlantillas(cliente: Cliente, origenId: string) {
  return cliente
    .from('plantillas_tarjeta')
    .select('id, estado, version, definicion, nota, actualizado_en, publicado_en')
    .eq('origen_id', origenId)
    .in('estado', ['borrador', 'publicada'])
    .limit(2)
}

// La fórmula publicada del origen (`formulas_publicada_unica`): contra ella se valida la plantilla.
export function consultaDeLaFormulaPublicada(cliente: Cliente, origenId: string) {
  return cliente
    .from('formulas')
    .select('id, version, definicion, diseno, visibilidad')
    .eq('origen_id', origenId)
    .eq('estado', 'publicada')
    .limit(1)
}

// El catálogo entero: la base no deja crear un 25.º (`_tonos_tope()`).
export function consultaDeLosTonos(cliente: Cliente) {
  return cliente.from('tonos').select('clave, nombre').order('nombre').limit(TOPE_DE_TONOS)
}
