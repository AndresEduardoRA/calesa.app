import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import { leerDisenoSobre, leerNivelesSobre } from './lectura-del-diseno'

// El diseño de un origen para editarlo, con la sesión de quien mira.
export async function leerDisenoDelOrigen(origenId: string) {
  return leerDisenoSobre(await createClient(), origenId)
}

// Los niveles que el diseño puede nombrar, con la sesión de quien mira.
export async function leerNivelesDelDiseno() {
  return leerNivelesSobre(await createClient())
}
