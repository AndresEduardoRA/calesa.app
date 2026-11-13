// Lo que la web pública lee del CRM, leído como lo leerá el sitio: la clave pública, sin sesión, por las vistas del esquema `web`.
import { createClient } from '@supabase/supabase-js'
import { entorno } from './base'

function visitante() {
  return createClient(
    entorno('NEXT_PUBLIC_SUPABASE_URL'),
    entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export type FaqPublica = {
  pregunta: string
  respuesta: string
  categoria: string | null
  orden: number
}

// Lo que `web.faqs` le devuelve a un anónimo, en su orden, de las que empiezan por `prefijo` (otros specs y la semilla pueden tener las suyas).
export async function faqsPublicas(prefijo: string): Promise<FaqPublica[]> {
  const { data, error } = await visitante()
    .schema('web')
    .from('faqs')
    .select('pregunta, respuesta, categoria, orden')
    .like('pregunta', `${prefijo}%`)
    .order('orden')
    .limit(50)
  if (error) {
    throw new Error(`web.faqs como anónimo: ${error.message}`)
  }
  return data
}

export type TestimonioPublico = {
  cliente: string
  ciudad: string | null
  texto: string
  vehiculo: string | null
  foto: string | null
  orden: number
}

// Lo que `web.testimonios` le devuelve a un anónimo, de los que empiezan por `prefijo`: la vista decide qué sale (ciudad, vehículo y foto sólo con su permiso
// de consentimiento; nada sin el trío o con el retiro).
export async function testimoniosPublicos(prefijo: string): Promise<TestimonioPublico[]> {
  const { data, error } = await visitante()
    .schema('web')
    .from('testimonios')
    .select('cliente, ciudad, texto, vehiculo, foto, orden')
    .like('cliente', `${prefijo}%`)
    .order('orden')
    .limit(50)
  if (error) {
    throw new Error(`web.testimonios como anónimo: ${error.message}`)
  }
  return data
}

export type RespuestaDelAsesor = { esRespaldo: boolean; nombre: string | null }

// El botón «Hablar con un asesor» de la web: `web.solicitar_asesor` con la clave pública y sin sesión, como lo llamará el sitio.
export async function pedirComoVisitante(token: string): Promise<RespuestaDelAsesor> {
  const { data, error } = await visitante()
    .schema('web')
    .rpc('solicitar_asesor', { p_token: token, p_fuente: 'boton_general' })
  if (error) {
    throw new Error(`web.solicitar_asesor como anónimo: ${error.message}`)
  }
  const respuesta = data as { es_respaldo?: boolean; nombre?: string | null }
  return { esRespaldo: respuesta.es_respaldo === true, nombre: respuesta.nombre ?? null }
}

// Lo que `web.guias` le devuelve a un anónimo de la guía con ese slug: su título, o `null` si no sale (borrador o programada).
export async function guiaPublica(slug: string): Promise<string | null> {
  const { data, error } = await visitante()
    .schema('web')
    .from('guias')
    .select('titulo')
    .eq('slug', slug)
    .limit(1)
  if (error) {
    throw new Error(`web.guias como anónimo: ${error.message}`)
  }
  return (data as { titulo: string }[])[0]?.titulo ?? null
}
