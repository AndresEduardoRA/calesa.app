import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDelDiseno } from '../../entities/diseno/edicion-del-diseno'
import { guardadoDelDisenoSobre } from './guardado-del-diseno'

// Las escrituras del diseño con el cliente de la sesión, uno por pedido: la base vuelve a pedir `cotizaciones.configurar` del origen.
export const repositorioDelDisenoSupabase: RepositorioDelDiseno = {
  guardarBorrador: async (pedido) =>
    guardadoDelDisenoSobre(await createClient()).guardarBorrador(pedido),
}
