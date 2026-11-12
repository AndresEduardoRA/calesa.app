import 'server-only'
import { z } from 'zod'
import {
  errorDePostgrest,
  fallo,
  MENSAJE_INESPERADO,
  ok,
  type Resultado,
} from '@/shared/lib/errores'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import { agruparIp } from '../../entities/portal/ip'
import type {
  CambioDeClaveDelPortal,
  ContadorDeIntentosDelPortal,
  IngresoAlPortal,
  LectorDeDireccionDelSitioParaElPortal,
  LectorDeEstadoDelPortal,
  UrlDeDocumentoDelPortal,
} from '../../entities/portal/repositorios'
import { otorgadoEnDelPortal } from '../../entities/portal/sesion'

// Las RPC del portal del cliente con el cliente admin (`.claude/rules/datos.md`): el único archivo del portal que lo crea, uno nuevo
// en cada llamada. Sólo llama `web.portal_*` (de `service_role`; cada una valida `otorgado_en` con `_portal_vigente`) y firma URLs
// de 60 s del bucket `documentos`. No lee tablas ni Vault. Lo que entra (código, clave, id) lo validan con Zod los handlers; aquí se
// valida lo que vuelve de la base, aceptando nulo donde la base puede darlo aunque el tipo generado no lo diga.

const BUCKET = 'documentos'
const SEGUNDOS_DE_LA_URL = 60

const filaDeIngreso = z.object({
  lead_id: z.guid(),
  nombre: z.string().nullable(),
  debe_cambiar_clave: z.boolean(),
  otorgado_en: otorgadoEnDelPortal,
})

function web() {
  return createAdminClient().schema('web')
}

// Lo que no pasa Zod es un cambio de contrato con la base: nunca se muestra el detalle.
function validado<T>(esquema: z.ZodType<T>, dato: unknown): Resultado<T> {
  const r = esquema.safeParse(dato)
  return r.success ? ok(r.data) : fallo('inesperado', MENSAJE_INESPERADO)
}

export const contarIntento: ContadorDeIntentosDelPortal = async (ipCruda) => {
  // Lo que no es una IP va vacío: la base lo cuenta como «desconocida», un solo balde.
  const { data, error } = await web().rpc('portal_intento', { p_ip: agruparIp(ipCruda) ?? '' })
  if (error) return { ok: false, error: errorDePostgrest(error) }
  return validado(z.boolean(), data)
}

export const ingresar: IngresoAlPortal = async (codigo, clave) => {
  const { data, error } = await web().rpc('portal_login', { p_codigo: codigo, p_clave: clave })
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const filas = validado(z.array(filaDeIngreso).max(1), data)
  if (!filas.ok) return filas
  const fila = filas.data[0]
  if (!fila) return ok(null)
  return ok({
    // `otorgado_en` tal cual lo dio la base: la cookie lo devuelve igual y `_portal_vigente` lo compara por igualdad.
    sesion: { lead_id: fila.lead_id, otorgado_en: fila.otorgado_en },
    nombre: fila.nombre ?? '',
    debe_cambiar_clave: fila.debe_cambiar_clave,
  })
}

export const leerEstado: LectorDeEstadoDelPortal = async (sesion) => {
  const { data, error } = await web().rpc('portal_snapshot', {
    p_lead: sesion.lead_id,
    p_otorgado_en: sesion.otorgado_en,
  })
  if (error) return { ok: false, error: errorDePostgrest(error) }
  return ok(data ?? null)
}

export const urlDeDocumento: UrlDeDocumentoDelPortal = async (sesion, documentoId) => {
  const admin = createAdminClient()
  const { data, error } = await admin.schema('web').rpc('portal_documento_ruta', {
    p_lead: sesion.lead_id,
    p_otorgado_en: sesion.otorgado_en,
    p_documento: documentoId,
  })
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const ruta = validado(z.string().min(1).nullable(), data)
  if (!ruta.ok || ruta.data === null) return ruta
  const firmada = await admin.storage.from(BUCKET).createSignedUrl(ruta.data, SEGUNDOS_DE_LA_URL)
  // El error de storage puede nombrar la ruta: no se propaga.
  if (firmada.error) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok(firmada.data.signedUrl)
}

export const cambiarClave: CambioDeClaveDelPortal = async (sesion, actual, nueva) => {
  const { data, error } = await web().rpc('portal_cambiar_clave', {
    p_lead: sesion.lead_id,
    p_otorgado_en: sesion.otorgado_en,
    p_actual: actual,
    p_nueva: nueva,
  })
  // Una clave nueva que no cumple: `22023` con el mensaje de la base, como `regla`.
  if (error) return { ok: false, error: errorDePostgrest(error) }
  return validado(z.boolean(), data)
}

export const leerDireccionDelSitio: LectorDeDireccionDelSitioParaElPortal = async () => {
  const { data, error } = await web().rpc('portal_direccion_publica')
  if (error) return { ok: false, error: errorDePostgrest(error) }
  return validado(z.string().nullable(), data)
}
