import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeTonos } from '../../entities/diseno/respuesta-de-tonos'
import { escrituraDeTonosSobre } from './escritura-de-tonos'

// Las escrituras del catálogo de tonos con el cliente de la sesión, uno por pedido: la base vuelve a pedir `cotizaciones.configurar`.
export const repositorioDeTonosSupabase: RepositorioDeTonos = {
  crear: async (pedido) => escrituraDeTonosSobre(await createClient()).crear(pedido),
  guardar: async (pedido) => escrituraDeTonosSobre(await createClient()).guardar(pedido),
  eliminar: async (pedido) => escrituraDeTonosSobre(await createClient()).eliminar(pedido),
}
