import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  SIN_PERMISO_PARA_TESTIMONIOS,
  TESTIMONIO_QUE_YA_NO_EXISTE,
  rechazoDeTestimonio,
  sinFilas,
  TESTIMONIO_CAMBIADO,
} from '../../entities/contenido/errores'
import type { RepositorioDeTestimonios } from '../../entities/contenido/repositorios'
import {
  COLUMNAS_DE_TESTIMONIO,
  ordenSiguienteDeTestimonio,
  TOPE_DE_TESTIMONIOS,
  testimoniosDesde,
  type Testimonio,
} from '../../entities/contenido/testimonios'
import type { DatosDeTestimonio } from '../../entities/contenido/testimonios-formulario'

const NO_SE_LEYO = 'No se pudieron cargar los testimonios.'
const NO_SE_LEYO_LA_RESPUESTA = 'No pudimos leer el testimonio. Recarga para ver cómo quedó.'

type Cliente = Awaited<ReturnType<typeof createClient>>

// Los testimonios en su orden, con tope (8.02-2). `web_testimonios` es una tabla de configuración de decenas de filas: sin índice por `orden` ni medición
// (`escala.md`; sólo la PK). Leer y escribir exigen `web.contenido.gestionar` (policies de la tabla); `consent_*` y `creado_en` se leen sin RPC.
async function leerEnOrden(
  supabase: Cliente,
): Promise<Resultado<{ testimonios: Testimonio[]; hayMas: boolean }>> {
  const { data, error } = await supabase
    .from('web_testimonios')
    .select(COLUMNAS_DE_TESTIMONIO)
    .order('orden')
    .order('creado_en', { ascending: false })
    .limit(TOPE_DE_TESTIMONIOS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidos = testimoniosDesde(data)
  if (leidos === null) {
    return fallo('inesperado', NO_SE_LEYO)
  }
  const { filas, hayMas } = cortarAlTope(leidos, TOPE_DE_TESTIMONIOS)
  return ok({ testimonios: filas, hayMas })
}

export async function leerTestimonios(): Promise<
  Resultado<{ testimonios: Testimonio[]; hayMas: boolean }>
> {
  return leerEnOrden(await createClient())
}

// Una escritura con la versión esperada quedó en cero filas: se relee la fila por id para decir ya no existe, conflicto o sin permiso.
async function ceroFilas(
  supabase: Cliente,
  id: string,
  esperada: string,
): Promise<ResultadoDeAccion<never>> {
  const { data, error } = await supabase
    .from('web_testimonios')
    .select('actualizado_en')
    .eq('id', id)
    .limit(1)
  if (error) {
    return rechazoDeTestimonio(error)
  }
  const fila = data[0]
  return sinFilas(
    { existe: fila !== undefined, versionDistinta: fila?.actualizado_en !== esperada },
    TESTIMONIO_CAMBIADO,
    { yaNoExiste: TESTIMONIO_QUE_YA_NO_EXISTE, sinPermiso: SIN_PERMISO_PARA_TESTIMONIOS },
  )
}

function unTestimonio(datos: unknown): Testimonio | null | undefined {
  const lista = testimoniosDesde(datos)
  return lista === null ? undefined : (lista[0] ?? null)
}

// Las columnas de la tabla que escribe la interfaz (`lead_id` y `consent_*` nunca: el consentimiento va por RPC).
function columnasDe(datos: Partial<DatosDeTestimonio>) {
  const { fotoRuta, ...resto } = datos
  return { ...resto, ...(fotoRuta === undefined ? {} : { foto_ruta: fotoRuta }) }
}

// Los testimonios se escriben directo, con el cliente de quien pide, y el límite es la RLS (`web.contenido.gestionar`) con las columnas permitidas; una
// escritura que la RLS o la versión dejan en cero filas nunca es éxito (8.02-2, D1).
export const testimoniosSupabase: RepositorioDeTestimonios = {
  crear: async (datos) => {
    const supabase = await createClient()
    const leidos = await leerEnOrden(supabase)
    if (!leidos.ok) {
      return leidos
    }
    const { data, error } = await supabase
      .from('web_testimonios')
      .insert({
        cliente: datos.cliente,
        ciudad: datos.ciudad,
        vehiculo: datos.vehiculo,
        texto: datos.texto,
        publicado: datos.publicado,
        foto_ruta: datos.fotoRuta,
        orden: ordenSiguienteDeTestimonio(leidos.data.testimonios),
      })
      .select(COLUMNAS_DE_TESTIMONIO)
      .limit(1)
    if (error) {
      return rechazoDeTestimonio(error)
    }
    const creado = unTestimonio(data)
    if (creado === undefined) return fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
    return creado === null
      ? fallo('sin_permiso', 'No se pudo crear el testimonio.')
      : { ok: true, data: creado }
  },
  guardar: async ({ id, actualizadoEnEsperado, cambios }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('web_testimonios')
      .update(columnasDe(cambios))
      .eq('id', id)
      .eq('actualizado_en', actualizadoEnEsperado)
      .select(COLUMNAS_DE_TESTIMONIO)
      .limit(1)
    if (error) {
      return rechazoDeTestimonio(error)
    }
    const guardado = unTestimonio(data)
    if (guardado === undefined) return fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
    return guardado === null
      ? ceroFilas(supabase, id, actualizadoEnEsperado)
      : { ok: true, data: guardado }
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('web_testimonios')
      .delete()
      .eq('id', id)
      .eq('actualizado_en', actualizadoEnEsperado)
      .select('id')
      .limit(1)
    if (error) {
      return rechazoDeTestimonio(error)
    }
    return data.length > 0
      ? { ok: true, data: { id } }
      : ceroFilas(supabase, id, actualizadoEnEsperado)
  },
}
