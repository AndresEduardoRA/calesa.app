import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import { leerPlantillaSobre } from './lectura-sobre'

// La plantilla de un origen para editarla, con la sesión de quien mira.
export async function leerPlantillaDelOrigen(origenId: string) {
  return leerPlantillaSobre(await createClient(), origenId)
}
