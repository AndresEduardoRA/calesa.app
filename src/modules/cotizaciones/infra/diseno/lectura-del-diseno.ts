// Lo que lee la pestaña «Diseño» de Configuración › Cotización (4.22-2) sobre el cliente que recibe: el diseño de un origen para editarlo y los niveles que el
// diseño puede nombrar. Sin `server-only`, para que una prueba la corra; `lectura.ts` la envuelve con el cliente de la sesión de quien mira. La policy `formulas: leer`
// deja ver sólo los orígenes donde tiene `cotizaciones.configurar` (D7); `cotizaciones_niveles` la lee cualquier `authenticated`.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import { esquemaDiseno } from '../../entities/diseno'
import type { DisenoParaEditar, NivelDelDiseno } from '../../entities/diseno/edicion-del-diseno'
import { esquemaDefinicion } from '../../entities/formula'

type Cliente = SupabaseClient<Database>

// La base pone un tope de 10 niveles (con los retirados); se pide una holgura.
export const NIVELES_A_LEER = 50

const NO_SE_LEYO = 'No pudimos leer el diseño.'

const esquemaDeLaFila = z.strictObject({
  id: z.guid(),
  estado: z.enum(['borrador', 'publicada']),
  definicion: z.unknown(),
  params: z.record(z.string(), z.unknown()),
  diseno: esquemaDiseno.nullable(),
  nota: z.string().nullable(),
  actualizado_en: z.string().min(1),
})

// Un borrador y una publicada por origen: `formulas_borrador_unico` y `formulas_publicada_unica` (`origen_id` con `where estado = …`).
function consulta(cliente: Cliente, origenId: string, estado: 'borrador' | 'publicada') {
  return cliente
    .from('formulas')
    .select('id, estado, definicion, params, diseno, nota, actualizado_en')
    .eq('origen_id', origenId)
    .eq('estado', estado)
    .limit(1)
}

// El borrador gana a la publicada; sin ninguna, nulo. Lo que no tiene la forma de una fórmula no se edita.
export async function leerDisenoSobre(
  cliente: Cliente,
  origenId: string,
): Promise<Resultado<DisenoParaEditar | null>> {
  if (!z.guid().safeParse(origenId).success) {
    return fallo('validacion', 'Ese origen no es válido.')
  }
  const [borrador, publicada] = await Promise.all([
    consulta(cliente, origenId, 'borrador'),
    consulta(cliente, origenId, 'publicada'),
  ])
  const error = borrador.error ?? publicada.error
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const [primera] = [
    ...(Array.isArray(borrador.data) ? (borrador.data as unknown[]) : []),
    ...(Array.isArray(publicada.data) ? (publicada.data as unknown[]) : []),
  ]
  if (primera === undefined) return ok(null)
  const fila = esquemaDeLaFila.safeParse(primera)
  const definicion = fila.success ? esquemaDefinicion.safeParse(fila.data.definicion) : null
  if (!fila.success || !definicion?.success) return fallo('inesperado', NO_SE_LEYO)
  const { id, estado, params, diseno, nota, actualizado_en } = fila.data
  return ok({
    id,
    estado,
    actualizadoEn: actualizado_en,
    nota,
    definicion: definicion.data,
    params,
    diseno,
  })
}

const esquemaDeLosNiveles = z.array(
  z.strictObject({ clave: z.string(), nombre: z.string(), retirado_en: z.string().nullable() }),
)

// `cotizaciones_niveles` (decenas de filas, tope de 10 en la base), por nombre.
export async function leerNivelesSobre(cliente: Cliente): Promise<Resultado<NivelDelDiseno[]>> {
  const { data, error } = await cliente
    .from('cotizaciones_niveles')
    .select('clave, nombre, retirado_en')
    .order('nombre')
    .limit(NIVELES_A_LEER)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const leidos = esquemaDeLosNiveles.safeParse(data)
  if (!leidos.success) return fallo('inesperado', 'No pudimos leer los niveles.')
  return ok(
    leidos.data.map((n) => ({
      clave: n.clave,
      nombre: n.nombre,
      retirado: n.retirado_en !== null,
    })),
  )
}
