import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeLaFormula } from '../../entities/formula/repositorio'
import { publicacionSobre } from './rpc-de-publicacion'

// Las escrituras de la fórmula con el cliente de la sesión, uno por pedido.
export const publicacionSupabase: RepositorioDeLaFormula = {
  publicar: async (pedido) => publicacionSobre(await createClient()).publicar(pedido),
  revertir: async (pedido) => publicacionSobre(await createClient()).revertir(pedido),
}
