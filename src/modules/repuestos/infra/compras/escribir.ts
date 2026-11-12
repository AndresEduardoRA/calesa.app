import 'server-only'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import { NO_SE_LEYO_LA_RESPUESTA, rechazoDeCompra } from '../../entities/compras/errores'
import type {
  CompraGuardada,
  CompraVersionada,
  RepositorioDeCompras,
} from '../../entities/compras/repositorio'

// Las compras se escriben sólo por RPC (8.11-1: `repuesto_compra_guardar`, `_eliminar`, `_restaurar`), con el cliente de quien pide: la base vuelve a exigir
// `repuestos.costos.editar` y `repuestos.ver`, valida la lista cerrada de `p_datos` y pone el monto en base y la tasa. Acá no hay aritmética.

// «Crear»: la base toma la esperada como nula. Los tipos generados la dan como `string` (la función no tiene valor por omisión) y un `undefined` no viaja en el JSON
// de supabase-js: tiene que ser un `null` explícito (el patrón de `cotizaciones/infra/plantilla/rpc-de-la-plantilla.ts`).
const ESPERADA_NULA = null as unknown as string

const esquemaGuardada = z.object({
  id: z.guid(),
  actualizado_en: z.string().min(1),
  tipo_cambio_aplicado: z.number().nullable(),
  monto_base: z.number().nullable(),
  ya_existia: z.boolean().optional(),
  sin_cambios: z.boolean().optional(),
})

const esquemaVersionada = z.object({ id: z.guid(), actualizado_en: z.string().min(1) })

function guardada(datos: unknown): ResultadoDeAccion<CompraGuardada> {
  const leido = esquemaGuardada.safeParse(datos)
  if (!leido.success) return fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
  const g = leido.data
  return ok({
    id: g.id,
    actualizadoEn: g.actualizado_en,
    tipoCambioAplicado: g.tipo_cambio_aplicado,
    montoBase: g.monto_base,
  })
}

function versionada(datos: unknown): ResultadoDeAccion<CompraVersionada> {
  const leido = esquemaVersionada.safeParse(datos)
  return leido.success
    ? ok({ id: leido.data.id, actualizadoEn: leido.data.actualizado_en })
    : fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
}

export const comprasSupabase: RepositorioDeCompras = {
  guardar: async ({ id, proyectoId, actualizadoEnEsperado, datos }) => {
    const supabase = await createClient()
    const crear = actualizadoEnEsperado === null
    const { data, error } = await supabase.rpc('repuesto_compra_guardar', {
      p_id: id,
      // Al crear, la base pide el proyecto; al editar, una compra no cambia de proyecto y no se manda.
      p_datos: (crear ? { proyecto_id: proyectoId, ...datos } : datos) as Json,
      p_actualizado_en_esperado: crear ? ESPERADA_NULA : actualizadoEnEsperado,
    })
    return error ? rechazoDeCompra(error) : guardada(data)
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('repuesto_compra_eliminar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? rechazoDeCompra(error) : versionada(data)
  },
  restaurar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('repuesto_compra_restaurar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? rechazoDeCompra(error) : versionada(data)
  },
}
