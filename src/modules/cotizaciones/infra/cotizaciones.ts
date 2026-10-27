import 'server-only'
import { resultadoDeCrear } from '../entities/guardado'
import { argumentosDeCrear } from '../entities/pedido-de-guardado'
import type { CreadorDeCotizacion } from '../entities/repositorios-de-hoja'
import { createClient } from '@/shared/lib/supabase/server'

// Guardar la hoja: UNA llamada a `cotizacion_crear()` con la sesión de quien cotiza. La base comprueba los permisos, el lead, el vehículo y la hoja abierta firmada, calcula
// con la versión y las tarifas de esa hoja y devuelve lo recortado; un intento que ya entró vuelve con `repetido`. Lo que trae `code` es un rechazo; lo que no, una respuesta
// perdida (`resultadoDeCrear()`).
export const crearCotizacion: CreadorDeCotizacion = async (pedido) => {
  const supabase = await createClient()
  return resultadoDeCrear(await supabase.rpc('cotizacion_crear', argumentosDeCrear(pedido)))
}
