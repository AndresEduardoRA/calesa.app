// El terreno y los pedidos de `e2e/portal-api.spec.ts` (8.07-3): un cliente con acceso al portal, un vehículo suyo con VIN y un
// documento visible en el portal (un PDF subido a `documentos`), y los pedidos HTTP a `api/portal/*` como los hará el sitio.
import { createHash, randomInt } from 'node:crypto'
import type { APIRequestContext, PlaywrightWorkerArgs } from '@playwright/test'
import { admin } from './base'
import { exigir, vincular } from './leads'
import { nuevoLead } from './leads-ficha'
import { completoCon, nacional } from './leads-ficha-telefonos'
import { limpiarPortal, otorgarComo, prepararPortal, type TerrenoDelPortal } from './leads-portal'
import { borrarMover, sembrarMover } from './mover'

export type TerrenoDelPortalPorHttp = {
  t: TerrenoDelPortal
  proyecto: string
  leadId: string
  vehiculoId: string
  vin: string
  documentoId: string
  ruta: string
  pdf: Buffer
  codigo: string
}

const BUCKET = 'documentos'
// Un VIN válido (sin I, O ni Q) y propio de la corrida: `vehiculos.vin` es único entre los vivos.
const LETRAS_DEL_VIN = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'
const vinAlAzar = () =>
  `PRTL${Array.from({ length: 13 }, () => LETRAS_DEL_VIN[randomInt(LETRAS_DEL_VIN.length)]).join('')}`

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')

export async function prepararPortalPorHttp(
  proyecto: string,
  clave: string,
): Promise<TerrenoDelPortalPorHttp> {
  // El CI reintenta una vez y `serial` repite este `beforeAll` con el mismo proyecto: lo de una corrida anterior se quita primero.
  await borrarMover(proyecto)
  const t = await prepararPortal(proyecto)
  const mover = await sembrarMover(proyecto)
  const lead = await nuevoLead({
    corto: `Portal HTTP ${proyecto}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.pia.email,
  })
  const cliente = admin()
  const vin = vinAlAzar()
  exigir(
    (await cliente.from('vehiculos').update({ vin }).eq('id', mover.enB.id)).error,
    'poner el VIN',
  )
  await vincular(mover.enB.id, lead.id)
  exigir(
    (
      await cliente
        .from('tipos_documento')
        .update({ visible_portal_permitido: true })
        .eq('id', mover.tipoDeBl.id)
    ).error,
    'permitir el tipo en el portal',
  )
  const ruta = `${mover.enB.id}/${createHash('sha256').update(PDF).digest('hex')}.pdf`
  exigir(
    (
      await cliente.storage
        .from(BUCKET)
        .upload(ruta, PDF, { contentType: 'application/pdf', upsert: true })
    ).error,
    'subir el PDF',
  )
  const { data: documento, error } = await cliente
    .from('documentos')
    .insert({
      vehiculo_id: mover.enB.id,
      tipo_documento_id: mover.tipoDeBl.id,
      ruta,
      nombre_archivo: 'bl.pdf',
      mime: 'application/pdf',
      bytes: PDF.length,
      visible_portal: true,
    })
    .select('id')
    .single<{ id: string }>()
  exigir(error, 'registrar el documento')
  const otorgado = await otorgarComo(t.pia.email, lead.id, clave)
  return {
    t,
    proyecto,
    leadId: lead.id,
    vehiculoId: mover.enB.id,
    vin,
    documentoId: documento?.id ?? '',
    ruta,
    pdf: PDF,
    codigo: otorgado.codigo,
  }
}

export async function limpiarPortalPorHttp(
  terreno: TerrenoDelPortalPorHttp | undefined,
): Promise<void> {
  if (!terreno) return
  await admin().storage.from(BUCKET).remove([terreno.ruta])
  await borrarMover(terreno.proyecto)
  await limpiarPortal(terreno.t)
}

// Una IPv6 de un /64 al azar: el límite cuenta por /64 (`agruparIp`) y así una corrida no hereda la cuenta de otra en 15 min.
export function ipAlAzar(): string {
  const grupo = () => randomInt(0x10000).toString(16)
  return `2001:db8:${grupo()}:${grupo()}::1`
}

export type Respuesta = {
  status: number
  cabecera: (nombre: string) => string | undefined
  cookies: string[]
  texto: string
  bytes: Buffer
}

type Pedido = {
  metodo?: 'GET' | 'POST'
  ip?: string
  origen?: string | null
  cookie?: string
  cuerpo?: unknown
}

// Un contexto nuevo por pedido: la cookie viaja sólo si se pasa (D6: no depende de si el almacén guarda una `Secure` en `http://localhost`).
export async function pedir(
  playwright: PlaywrightWorkerArgs['playwright'],
  baseURL: string,
  ruta: string,
  { metodo = 'GET', ip, origen, cookie, cuerpo }: Pedido = {},
): Promise<Respuesta> {
  const contexto: APIRequestContext = await playwright.request.newContext({ baseURL })
  try {
    const headers: Record<string, string> = {}
    if (ip) headers['x-forwarded-for'] = ip
    if (origen) headers['origin'] = origen
    if (cookie) headers['cookie'] = `portal=${cookie}`
    const r = await contexto.fetch(ruta, {
      method: metodo,
      headers,
      maxRedirects: 0,
      ...(cuerpo === undefined ? {} : { data: cuerpo }),
    })
    const bytes = await r.body()
    const lista = r.headersArray()
    return {
      status: r.status(),
      cabecera: (nombre) => r.headers()[nombre.toLowerCase()],
      cookies: lista.filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value),
      texto: bytes.toString('utf8'),
      bytes,
    }
  } finally {
    await contexto.dispose()
  }
}

// La cookie `portal` que puso la respuesta: su valor y sus atributos en minúsculas.
export function cookieDelPortal(r: Respuesta): { valor: string; atributos: string[] } | null {
  const linea = r.cookies.find((c) => c.startsWith('portal='))
  if (!linea) return null
  const [par = '', ...atributos] = linea.split(';').map((p) => p.trim())
  return { valor: par.slice('portal='.length), atributos: atributos.map((a) => a.toLowerCase()) }
}
