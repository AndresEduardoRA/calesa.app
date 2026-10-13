// La papelera en los e2e: lo que quedó en la base después de enviar, restaurar o purgar, y la
// limpieza de Storage corrida a mano (en producción la dispara el job de cada hora).
import { DOMINIO_E2E, admin, entorno } from './base'

function exigir(error: { message: string } | null, que: string): void {
  if (error) {
    throw new Error(`No se pudo ${que}: ${error.message}`)
  }
}

export type EnPapelera = {
  eliminado_en: string | null
  lote_papelera_id: string | null
  publicado_web: boolean
}

// Cómo quedó un vehículo, mirado con el cliente de servicio (la RLS esconde lo eliminado a
// todos). null = ya no existe: se purgó.
export async function estadoDe(vehiculoId: string): Promise<EnPapelera | null> {
  const { data, error } = await admin()
    .from('vehiculos')
    .select('eliminado_en, lote_papelera_id, publicado_web')
    .eq('id', vehiculoId)
    .maybeSingle<EnPapelera>()
  exigir(error, 'leer el vehículo')
  return data
}

export async function publicarSinPantalla(vehiculoId: string): Promise<void> {
  exigir(
    (await admin().from('vehiculos').update({ publicado_web: true }).eq('id', vehiculoId)).error,
    'publicar el vehículo',
  )
}

export async function ponerVin(vehiculoId: string, vin: string | null): Promise<void> {
  exigir(
    (await admin().from('vehiculos').update({ vin }).eq('id', vehiculoId)).error,
    'ponerle el VIN al vehículo',
  )
}

// Antes de borrar a las personas de prueba: un lote recuerda quién lo envió y quién lo restauró.
// Sus vehículos ya tienen que haberse ido.
export async function borrarLotesDePrueba(): Promise<void> {
  const cliente = admin()
  const personas = await cliente
    .from('perfiles')
    .select('id')
    .like('email', `%@${DOMINIO_E2E}`)
    .returns<{ id: string }[]>()
  exigir(personas.error, 'leer las personas de prueba')
  const ids = (personas.data ?? []).map((persona) => persona.id)
  if (ids.length > 0) {
    exigir(
      (await cliente.from('lotes_papelera').delete().in('creado_por', ids)).error,
      'borrar los lotes de prueba',
    )
  }
}

type RespuestaDeGc = { ok: boolean; data?: { borrados: number; fallidos: number } }

// Una corrida de `storage-gc`, como la que dispara el job: se emite un pase de un solo uso (la
// tabla es sólo de `service_role`) y se le pide a la función que limpie. Devuelve cuántos borró.
export async function correrStorageGc(): Promise<number> {
  const pase = await admin().from('cola_gc_pases').insert({}).select('pase').single<{
    pase: string
  }>()
  exigir(pase.error, 'emitir el pase de la limpieza')
  const respuesta = await llamarAStorageGc({ pase: pase.data?.pase })
  const cuerpo = (await respuesta.json()) as RespuestaDeGc
  if (!respuesta.ok || !cuerpo.ok || !cuerpo.data) {
    throw new Error(`storage-gc respondió ${String(respuesta.status)}: ${JSON.stringify(cuerpo)}`)
  }
  if (cuerpo.data.fallidos > 0) {
    throw new Error(`storage-gc no pudo borrar ${String(cuerpo.data.fallidos)} objeto(s).`)
  }
  return cuerpo.data.borrados
}

// La función, llamada como lo haría cualquiera desde afuera: sin clave, con lo que se le mande.
export function llamarAStorageGc(cuerpo: unknown): Promise<Response> {
  const base = entorno('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')
  return fetch(`${base}/functions/v1/storage-gc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  })
}
