// Los tipos de documento que aplican a una unidad y lo que sus fases siguientes piden (6.06-1). Son configuración (un puñado de filas: el tope de la base es de 100 tipos), así que se
// pide `tope + 1` sólo para saber si se cortó. Cualquier cuenta con sesión lee estas tablas; quién sube o aprueba lo decide la base.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { tiposDesde, type TipoDeDocumento } from '../../entities/documentos/documento'
import type { RequisitoDeDocumento } from '../../entities/documentos/requisito'
import type { Unidad } from '../../entities/nucleo/unidad'

export const NO_SE_CARGARON_LOS_TIPOS = 'No se pudieron cargar los tipos de documento.'

// El tope de `tipos_documento` en la base (`_tipos_documento_tope`).
const TOPE_DE_TIPOS = 100
// Las salidas de una fase y los requisitos de documento de las fases a las que lleva: configuración.
const TOPE_DE_SALIDAS = 50
const TOPE_DE_REQUISITOS = 200

// `tipos_documento` activos: los globales (`flujo_id` nulo) y los del flujo de esa unidad (el activo de su origen y su ámbito).
export async function leerTiposDeLaUnidad(
  unidad: Pick<Unidad, 'tipo' | 'origenId'>,
): Promise<Resultado<TipoDeDocumento[]>> {
  const supabase = createClient()
  const flujos = await supabase
    .from('flujos')
    .select('id')
    .eq('origen_id', unidad.origenId)
    .eq('ambito', unidad.tipo === 'vehiculo' ? 'vehiculos' : 'repuestos')
    .eq('activo', true)
    .limit(1)
  if (flujos.error) {
    return { ok: false, error: errorDePostgrest(flujos.error) }
  }
  const flujoId = flujos.data[0]?.id
  let consulta = supabase
    .from('tipos_documento')
    .select(
      'id, nombre, formatos, modo_vencimiento, vigencia_dias, visible_portal_permitido, flujo_id, orden',
    )
    .eq('activo', true)
  consulta = flujoId
    ? consulta.or(`flujo_id.is.null,flujo_id.eq.${flujoId}`)
    : consulta.is('flujo_id', null)
  const { data, error } = await consulta
    .order('orden')
    .order('nombre')
    .limit(TOPE_DE_TIPOS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const tipos = tiposDesde(data)
  return tipos ? ok(tipos.slice(0, TOPE_DE_TIPOS)) : fallo('inesperado', NO_SE_CARGARON_LOS_TIPOS)
}

type FilaDeSalida = { destino: { id: string; nombre: string } }
type FilaDeRequisito = {
  id: string
  fase_id: string
  tipo_documento_id: string | null
  min_archivos: number | null
  max_archivos: number | null
  formatos: string[] | null
  bloqueante: boolean
}

// Los requisitos de documento de las fases a las que esa unidad puede ir (D5): sus salidas (`fases_transiciones` por `de_fase_id`) y, de esas fases, `fases_requisitos` de tipo documento
// (`evaluar_requisitos` los mira por la fase de destino). Sin fase actual no hay salidas que mirar: `[]`.
export async function leerRequisitosDeDocumento(
  faseId: string | null,
): Promise<Resultado<RequisitoDeDocumento[]>> {
  if (faseId === null) {
    return ok([])
  }
  const supabase = createClient()
  const salidas = await supabase
    .from('fases_transiciones')
    .select('destino:fases!fases_transiciones_a_fase_id_fkey!inner(id, nombre, activa)')
    .eq('de_fase_id', faseId)
    .eq('destino.activa', true)
    .limit(TOPE_DE_SALIDAS)
  if (salidas.error) {
    return { ok: false, error: errorDePostgrest(salidas.error) }
  }
  const destinos = (salidas.data as unknown as FilaDeSalida[]).map((s) => s.destino)
  if (destinos.length === 0) {
    return ok([])
  }
  const { data, error } = await supabase
    .from('fases_requisitos')
    .select('id, fase_id, tipo_documento_id, min_archivos, max_archivos, formatos, bloqueante')
    .eq('tipo', 'documento')
    .in(
      'fase_id',
      destinos.map((d) => d.id),
    )
    .order('orden')
    .limit(TOPE_DE_REQUISITOS)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const nombres = new Map(destinos.map((d) => [d.id, d.nombre]))
  const requisitos: RequisitoDeDocumento[] = []
  for (const r of data as FilaDeRequisito[]) {
    if (r.tipo_documento_id === null) continue
    requisitos.push({
      id: r.id,
      tipoId: r.tipo_documento_id,
      faseId: r.fase_id,
      faseNombre: nombres.get(r.fase_id) ?? '',
      min: r.min_archivos,
      max: r.max_archivos,
      formatos: r.formatos,
      bloqueante: r.bloqueante,
    })
  }
  return ok(requisitos)
}
