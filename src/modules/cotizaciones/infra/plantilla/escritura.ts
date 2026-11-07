import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeLaPlantilla } from '../../entities/plantilla/escritura-de-la-plantilla'
import { plantillaSobre } from './rpc-de-la-plantilla'

// Las escrituras de la plantilla con el cliente de la sesión, uno por pedido.
export const plantillaSupabase: RepositorioDeLaPlantilla = {
  guardar: async (pedido) => plantillaSobre(await createClient()).guardar(pedido),
  publicar: async (pedido) => plantillaSobre(await createClient()).publicar(pedido),
  descartar: async (pedido) => plantillaSobre(await createClient()).descartar(pedido),
}
