// La vitrina en los e2e: lo que hay que encender para que algo de un origen de prueba se vea en
// la web pública (todavía no tiene pantalla: llega con el módulo web), y el visitante, que mira
// con la clave pública y sin sesión, como lo hará el sitio.
import { createClient } from '@supabase/supabase-js'
import { admin, entorno } from './base'

function exigir(error: { message: string } | null, que: string): void {
  if (error) {
    throw new Error(`No se pudo ${que}: ${error.message}`)
  }
}

// Una fase inicial que publica, en el flujo del origen. Lo que se dé de alta después entra ahí.
export async function crearFaseQuePublica(origenId: string, nombre: string): Promise<string> {
  const cliente = admin()
  const flujo = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', origenId)
    .single<{ id: string }>()
  exigir(flujo.error, 'leer el flujo del origen')
  const fase = await cliente
    .from('fases')
    .insert({ flujo_id: flujo.data?.id, nombre, es_inicial: true, publica_web: true, orden: 10 })
    .select('id')
    .single<{ id: string }>()
  exigir(fase.error, 'crear la fase que publica')
  return fase.data?.id ?? ''
}

// Otra fase del mismo flujo, que no es inicial ni publica.
export async function crearFaseInterna(origenId: string, nombre: string): Promise<string> {
  const cliente = admin()
  const flujo = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', origenId)
    .single<{ id: string }>()
  exigir(flujo.error, 'leer el flujo del origen')
  const fase = await cliente
    .from('fases')
    .insert({ flujo_id: flujo.data?.id, nombre, orden: 20 })
    .select('id')
    .single<{ id: string }>()
  exigir(fase.error, 'crear la fase interna')
  return fase.data?.id ?? ''
}

// Un origen con fases no se borra (una regla del flujo no se apaga mientras una fase la tenga
// marcada): primero van ellas. Los vehículos ya tienen que haberse ido.
export async function borrarFasesDe(clavesDeOrigen: string[]): Promise<void> {
  const cliente = admin()
  const origenes = await cliente
    .from('origenes')
    .select('id')
    .in('clave', clavesDeOrigen)
    .returns<{ id: string }[]>()
  exigir(origenes.error, 'leer los orígenes de prueba')
  const flujos = await cliente
    .from('flujos')
    .select('id')
    .in(
      'origen_id',
      (origenes.data ?? []).map((origen) => origen.id),
    )
    .returns<{ id: string }[]>()
  exigir(flujos.error, 'leer los flujos de prueba')
  const ids = (flujos.data ?? []).map((flujo) => flujo.id)
  if (ids.length > 0) {
    exigir((await cliente.from('fases').delete().in('flujo_id', ids)).error, 'borrar las fases')
  }
}

export async function ponerEnFase(vehiculoId: string, faseId: string | null): Promise<void> {
  exigir(
    (await admin().from('vehiculos').update({ fase_id: faseId }).eq('id', vehiculoId)).error,
    'poner el vehículo en su fase',
  )
}

// El sitio encendido y mostrando estos orígenes. Son filas únicas: `cerrarVitrina()` las deja
// como en `supabase/seed.sql`.
export async function abrirVitrina(origenIds: string[]): Promise<void> {
  const cliente = admin()
  exigir(
    (await cliente.from('integraciones').update({ activa: true }).eq('clave', 'web_publica')).error,
    'encender la web pública',
  )
  exigir(
    (await cliente.from('ajustes_web').update({ origenes_visibles: origenIds }).eq('id', 1)).error,
    'hacer visibles los orígenes',
  )
}

export async function cerrarVitrina(): Promise<void> {
  const cliente = admin()
  exigir(
    (await cliente.from('integraciones').update({ activa: false }).eq('clave', 'web_publica'))
      .error,
    'apagar la web pública',
  )
  exigir(
    (await cliente.from('ajustes_web').update({ origenes_visibles: [] }).eq('id', 1)).error,
    'vaciar los orígenes visibles',
  )
}

// Marca un campo del layout como público (o deja de serlo).
export async function hacerPublico(origenId: string, clave: string, publico = true): Promise<void> {
  exigir(
    (
      await admin()
        .from('origenes_campos')
        .update({ publico_web: publico })
        .eq('origen_id', origenId)
        .eq('clave', clave)
    ).error,
    'marcar el campo como público',
  )
}

// El visitante: la clave pública, sin sesión. Lo mismo que tendrá el sitio.
function visitante() {
  return createClient(
    entorno('NEXT_PUBLIC_SUPABASE_URL'),
    entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export type FilaPublica = Record<string, unknown> & { id: string; titulo: string }

// Lo que `web.vehiculos` le devuelve a un anónimo, de un origen (por su clave).
export async function vitrinaPublica(claveDeOrigen: string): Promise<FilaPublica[]> {
  const { data, error } = await visitante()
    .schema('web')
    .from('vehiculos')
    .select('*')
    .eq('origen', claveDeOrigen)
    .returns<FilaPublica[]>()
  exigir(error, 'leer la vitrina como visitante')
  return data ?? []
}

// El código del rechazo, o cuántas filas le dieron.
const resultadoDe = (respuesta: { error: { code?: string } | null; data: unknown[] | null }) =>
  respuesta.error?.code ?? respuesta.data?.length

// Lo que un anónimo consigue de cada puerta que no es la vitrina.
export async function loQueVeElVisitante(vehiculoId: string) {
  const cliente = visitante()
  const previa = await cliente.rpc('vehiculo_vitrina_previa', { p_vehiculo: vehiculoId })
  const carpeta = await cliente.storage.from('vehiculos').list(vehiculoId)
  return {
    tabla: resultadoDe(await cliente.from('vehiculos').select('id').eq('id', vehiculoId)),
    fotos: resultadoDe(
      await cliente.from('vehiculos_imagenes').select('id').eq('vehiculo_id', vehiculoId),
    ),
    interesados: resultadoDe(
      await cliente.from('vehiculos_interesados').select('lead_id').eq('vehiculo_id', vehiculoId),
    ),
    previa: previa.error?.code ?? 'respondió',
    carpeta: carpeta.error ? 'rechazado' : carpeta.data.length,
  }
}
