// Lo que los e2e del alta por apibara necesitan: las respuestas grabadas de la API real, un
// interceptor de la edge function (ningún e2e llama a apibara de verdad) y el estado de la
// integración, que se deja como estaba.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { admin } from './base'
import { borrarFotosDe, fotos } from './fotos'
import { limpiarInventario, prepararInventario } from './inventario'
import { PREFIJO_CLAVE_E2E, crearOrigenDePrueba } from './origenes'
import { borrarVehiculosDe } from './vehiculos'

type Ficha = { data: Record<string, unknown>; url?: unknown }

function leer(nombre: string): Ficha {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'e2e/fixtures/apibara', nombre), 'utf8'),
  ) as Ficha
}

// Lo que devolvieron Copart (lote 58540656, 14 fotos y un video) e IAAI (lote 45312823, 17 fotos,
// un video y un 360°) en llamadas reales.
export const COPART = leer('copart.json').data
export const IAAI = leer('iaai.json').data

// Otro lote de Copart, con sólo dos fotos: lo que el test necesita para tener a un segundo.
export function otroCopart(cambios: Record<string, unknown>): Record<string, unknown> {
  const media = COPART['media'] as { items: unknown[] }
  return {
    ...COPART,
    media: { ...media, items: media.items.slice(0, 2) },
    ...cambios,
  }
}

export const ENLACE_DE_COPART =
  'https://www.copart.com/lot/58540656/clean-title-2024-ford-bronco-big-bend'

export type Pedido = {
  accion: 'ficha' | 'foto' | 'uso'
  origen?: string
  entrada?: string
  url?: string
}

export type Respuesta =
  | { ok: true; data: { data: Record<string, unknown>; url: string | null } }
  | { ok: false; error: { codigo: string } }

export const fallo = (codigo: string): Respuesta => ({ ok: false, error: { codigo } })
export const ficha = (data: Record<string, unknown>, url: string | null = null): Respuesta => ({
  ok: true,
  data: { data, url },
})

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

// Responde por la edge function `apibara` en el navegador. `alFicha` decide qué devuelve la API
// para cada entrada; las fotos salen en memoria (una distinta por dirección). Lo que no es de
// esto (`uso`) o una dirección que no es de las plataformas se contesta con un error: nada se
// escapa a la red. Devuelve la lista de lo que se pidió, para comprobarlo.
export async function simularApibara(
  page: Page,
  alFicha: (entrada: string) => Respuesta,
): Promise<Pedido[]> {
  const pedidos: Pedido[] = []
  const numeroDeFoto = new Map<string, number>()
  await page.route('**/functions/v1/apibara', async (ruta) => {
    const peticion = ruta.request()
    if (peticion.method() === 'OPTIONS') {
      await ruta.fulfill({ status: 204, headers: CORS })
      return
    }
    const pedido = peticion.postDataJSON() as Pedido
    pedidos.push(pedido)
    if (pedido.accion === 'foto') {
      const url = pedido.url ?? ''
      const numero = numeroDeFoto.get(url) ?? numeroDeFoto.size + 100
      numeroDeFoto.set(url, numero)
      await ruta.fulfill({
        status: 200,
        headers: { ...CORS, 'content-type': 'application/octet-stream' },
        body: fotos(numero)[0]?.buffer ?? Buffer.alloc(0),
      })
      return
    }
    const respuesta = pedido.accion === 'ficha' ? alFicha(pedido.entrada ?? '') : fallo('proveedor')
    await ruta.fulfill({
      status: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify(respuesta),
    })
  })
  return pedidos
}

export type EstadoDeApibara = {
  activa: boolean
  config: unknown
  secreto_guardado_en: string | null
}

export async function leerApibara(): Promise<EstadoDeApibara> {
  const { data, error } = await admin()
    .from('integraciones')
    .select('activa, config, secreto_guardado_en')
    .eq('clave', 'apibara')
    .single<EstadoDeApibara>()
  if (error) {
    throw new Error(`No se pudo leer la integración: ${error.message}`)
  }
  return data
}

// Prende o apaga apibara sin tocar su clave real: con la pantalla basta que esté activa; si no
// había clave guardada se sella una fecha (nada llama a la API: la función está interceptada).
export async function fijarApibara(activa: boolean): Promise<void> {
  const actual = await leerApibara()
  const { error } = await admin()
    .from('integraciones')
    .update({
      activa,
      secreto_guardado_en: actual.secreto_guardado_en ?? new Date().toISOString(),
    })
    .eq('clave', 'apibara')
  if (error) {
    throw new Error(`No se pudo fijar apibara: ${error.message}`)
  }
}

export async function restaurarApibara(antes: EstadoDeApibara): Promise<void> {
  const { error } = await admin().from('integraciones').update(antes).eq('clave', 'apibara')
  if (error) {
    throw new Error(`No se pudo restaurar apibara: ${error.message}`)
  }
}

export type VehiculoDeSubasta = {
  id: string
  titulo: string
  lote: string | null
  vin: string | null
  plataforma: string | null
  url_origen: string | null
  kilometraje: number | null
  subasta_en: string | null
  estado_subasta: string | null
  apibara_sync_en: string | null
  apibara_raw: Record<string, unknown> | null
  atributos: Record<string, unknown>
}

export async function vehiculoPorLote(
  origenId: string,
  lote: string,
): Promise<VehiculoDeSubasta | null> {
  const { data, error } = await admin()
    .from('vehiculos')
    .select(
      'id, titulo, lote, vin, plataforma, url_origen, kilometraje, subasta_en, estado_subasta, apibara_sync_en, apibara_raw, atributos',
    )
    .eq('origen_id', origenId)
    .eq('lote', lote)
    .maybeSingle<VehiculoDeSubasta>()
  if (error) {
    throw new Error(`No se pudo leer el lote ${lote}: ${error.message}`)
  }
  return data
}

export type FotoDeOrigen = { orden: number; es_portada: boolean; origen_url: string | null }

export async function fotosConOrigen(vehiculoId: string): Promise<FotoDeOrigen[]> {
  const { data, error } = await admin()
    .from('vehiculos_imagenes')
    .select('orden, es_portada, origen_url')
    .eq('vehiculo_id', vehiculoId)
    .order('orden')
    .returns<FotoDeOrigen[]>()
  if (error) {
    throw new Error(`No se pudo leer las fotos: ${error.message}`)
  }
  return data
}

const CLAVE_DEL_ORIGEN = `${PREFIJO_CLAVE_E2E}subasta_apibara`

// Los vehículos (y sus fotos en Storage) del origen de subasta de estos e2e, de una corrida
// anterior o de ésta: un origen con vehículos no se borra.
async function limpiarSubasta(): Promise<void> {
  const { data } = await admin()
    .from('origenes')
    .select('id')
    .eq('clave', CLAVE_DEL_ORIGEN)
    .maybeSingle<{ id: string }>()
  if (!data) {
    return
  }
  const { data: vehiculos } = await admin()
    .from('vehiculos')
    .select('id')
    .eq('origen_id', data.id)
    .returns<{ id: string }[]>()
  await borrarFotosDe((vehiculos ?? []).map((una) => una.id))
  await borrarVehiculosDe([CLAVE_DEL_ORIGEN])
}

export type TerrenoDeSubasta = {
  // Da de alta y edita en el origen de subasta, y gestiona los ajustes de la empresa.
  duena: string
  // Tiene un rol, pero ningún permiso sobre vehículos.
  sinPermisos: string
  subasta: { id: string; nombre: string }
  // Cómo estaba apibara antes: se restaura al terminar.
  apibaraAntes: EstadoDeApibara
}

// Un origen de subasta con apibara encendida (sin tocar su clave real: la función se intercepta).
export async function prepararSubasta(proyecto: string): Promise<TerrenoDeSubasta> {
  await limpiarSubasta()
  const { duena, sinPermisos } = await prepararInventario(proyecto, ['empresa.ajustes.gestionar'])
  const subasta = await crearOrigenDePrueba('Subasta de prueba', 'subasta_apibara', {
    tipo: 'subasta',
    plataformas: ['copart', 'iaai'],
  })
  const apibaraAntes = await leerApibara()
  await fijarApibara(true)
  return { duena, sinPermisos, subasta, apibaraAntes }
}

export async function desmontarSubasta(apibaraAntes: EstadoDeApibara): Promise<void> {
  await restaurarApibara(apibaraAntes)
  await limpiarSubasta()
  await limpiarInventario()
}
