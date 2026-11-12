// Las unidades de un grupo (contenedor o reserva) desde el navegador, con la sesión de quien mira (6.04-3, D30): la RLS de `vehiculos` y `transportes` decide qué se ve. La fase viene embebida en
// la misma consulta: nunca una lectura por unidad.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  unidadesDeLaLecturaDelGrupo,
  type UnidadDelGrupo,
} from '../../entities/mover/grupo-del-lote'

export const NO_SE_LEYO_EL_GRUPO = 'No pudimos leer las unidades del grupo.'

// Un lote mueve hasta 200 (`TOPE_DEL_LOTE` de `flujos`): se piden 201 para saber si hay más.
const TOPE_DE_LA_LECTURA = 201

export type PedidoDelGrupo = {
  origenId: string
  tipo: 'contenedor' | 'booking'
  valor: string
}

// Por `transportes_contenedor_idx` / `transportes_booking_idx` (parciales sobre el valor) y `vehiculos_pkey`, con `limit 201`: recorre a lo sumo las unidades del grupo, no la tabla.
export async function leerUnidadesDelGrupo({
  origenId,
  tipo,
  valor,
}: PedidoDelGrupo): Promise<Resultado<{ unidades: UnidadDelGrupo[]; hayMas: boolean }>> {
  const { data, error } = await createClient()
    .from('vehiculos')
    .select(
      'id, titulo, fase_id, fase:fases!vehiculos_fase_id_fkey(nombre, orden), transportes!inner(contenedor, booking)',
    )
    .eq('origen_id', origenId)
    .is('eliminado_en', null)
    .eq(`transportes.${tipo}`, valor)
    .order('titulo')
    .order('id')
    .limit(TOPE_DE_LA_LECTURA)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const unidades = unidadesDeLaLecturaDelGrupo(data)
  if (unidades === null) {
    return fallo('inesperado', NO_SE_LEYO_EL_GRUPO)
  }
  return ok({
    unidades: unidades.slice(0, TOPE_DE_LA_LECTURA - 1),
    hayMas: unidades.length >= TOPE_DE_LA_LECTURA,
  })
}
