// «Visto», desde el navegador y con la sesión de quien mira (la RLS de `vistos` es de fila propia): registrar al abrir y leer lo de una página.
import { createClient } from '@/shared/lib/supabase/browser'
import {
  lecturaDeVistosDesde,
  type LecturaDeVistos,
  type ModuloDeVistos,
  type TipoDeVistos,
} from '../entities/vistos'

// Un registro abierto en un módulo. Un fallo no se dice: marcar visto nunca frena lo que la persona hacía.
export async function registrarVisto(modulo: ModuloDeVistos, tipo: TipoDeVistos, id: string) {
  await createClient().rpc('visto_registrar', { p_modulo: modulo, p_tipo: tipo, p_id: id })
}

// Lo visto de los ids de una página (hasta 100, por la PK) y el último visto del módulo: una llamada. Nulo si no se pudo leer.
export async function leerVistos(
  modulo: ModuloDeVistos,
  tipo: TipoDeVistos,
  ids: readonly string[],
): Promise<LecturaDeVistos | null> {
  const { data, error } = await createClient().rpc('vistos_de', {
    p_modulo: modulo,
    p_tipo: tipo,
    p_ids: ids.slice(0, 100),
  })
  return error ? null : lecturaDeVistosDesde(data)
}
