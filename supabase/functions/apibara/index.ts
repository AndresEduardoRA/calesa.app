// apibara: la única que habla con la API de Copart e IAAI. Existe para que la clave no salga de la
// base: la lee de Vault con la service key del runtime (`integracion_secreto`) y nunca la devuelve.
// Quien llama es el navegador, con su sesión; antes de leer la clave se le pregunta a la base qué
// puede hacer esa persona en ese origen (`apibara_contexto`). La ficha que trae la guarda en la base
// (`apibara_consulta_guardar`) y devuelve su id: guardar el vehículo la referencia, así el bruto
// del que la base deriva fecha y estado nunca sale del navegador. Contrato en
// supabase/functions/README.md.
// Sin dependencias: habla con PostgREST y con apibara por HTTP.

const BASE = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const PUBLICA = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const DIRECCION_POR_DEFECTO = 'https://apibara.tech/api/v1/vehicle-auction'
const DOMINIO = 'apibara.tech'
const ESPERA_MS = 15_000
const PESO_MAXIMO_DE_FOTO = 15 * 1024 * 1024
// Repite `HOSTS_DE_FOTO` de src/modules/vehiculos/entities/apibara.ts: un test las compara. Si la
// lista fuera libre, esta función serviría de proxy a cualquier sitio con nuestra clave.
const HOSTS_DE_FOTO = ['cs.copart.com', 'vis.iaai.com']
const PLATAFORMAS = ['copart', 'iaai']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const PATRON_DE_VIN = /^[A-HJ-NPR-Z0-9]{17}$/
const PATRON_DE_LOTE = /^\d{5,12}$/

type Codigo =
  | 'apagada'
  | 'sin_permiso'
  | 'entrada'
  | 'plataforma'
  | 'no_soportado'
  | 'no_encontrado'
  | 'clave_invalida'
  | 'cuota'
  | 'tiempo'
  | 'proveedor'

type Contexto = {
  aplica: boolean
  usuario: string | null
  activa: boolean
  endpoint: string | null
  plataformas: string[]
  puede_crear: boolean
  puede_editar: boolean
  puede_ver_uso: boolean
}

type Pedido =
  | { accion: 'ficha'; origen: string; entrada: string }
  | { accion: 'foto'; origen: string; url: string }
  | { accion: 'uso' }

type Resultado = { ok: true; cuerpo: unknown; binario?: Uint8Array } | { ok: false; codigo: Codigo }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Los errores esperados salen con 200 y `ok: false`: así el navegador lee el código sin que el
// cliente de Supabase lo trate como una caída de la función.
function json(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function fallo(codigo: Codigo): Response {
  return json({ ok: false, error: { codigo } })
}

// --- La base ---------------------------------------------------------------------------------------

async function rpc<T>(
  nombre: string,
  argumentos: Record<string, unknown>,
  cabeceras: Record<string, string>,
) {
  const respuesta = await fetch(`${BASE}/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: { ...cabeceras, 'Content-Type': 'application/json' },
    body: JSON.stringify(argumentos),
  })
  if (!respuesta.ok) {
    await respuesta.body?.cancel()
    throw new Error(`${nombre} respondió ${String(respuesta.status)}`)
  }
  return (await respuesta.json()) as T
}

// Con la sesión de quien llama: la base decide lo que esa persona puede.
function comoQuienLlama(req: Request): Record<string, string> {
  return {
    apikey: req.headers.get('apikey') ?? PUBLICA,
    Authorization: req.headers.get('Authorization') ?? '',
  }
}

const comoServicio = { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}` }

// --- Lo que pide ----------------------------------------------------------------------------------

function esTexto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0 && valor.length < 2000
}

function leerPedido(cuerpo: unknown): Pedido | null {
  if (cuerpo === null || typeof cuerpo !== 'object') {
    return null
  }
  const c = cuerpo as Record<string, unknown>
  if (c['accion'] === 'uso') {
    return { accion: 'uso' }
  }
  const origen = c['origen']
  if (typeof origen !== 'string' || !UUID.test(origen)) {
    return null
  }
  if (c['accion'] === 'ficha' && esTexto(c['entrada'])) {
    return { accion: 'ficha', origen, entrada: c['entrada'].trim() }
  }
  if (c['accion'] === 'foto' && esTexto(c['url'])) {
    return { accion: 'foto', origen, url: c['url'] }
  }
  return null
}

function plataformaDeEnlace(texto: string): string | null {
  try {
    const url = new URL(texto)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null
    }
    const host = url.hostname.toLowerCase()
    return PLATAFORMAS.find((p) => host === `${p}.com` || host.endsWith(`.${p}.com`)) ?? null
  } catch {
    return null
  }
}

function direccionDeApibara(endpoint: string | null): string | null {
  const direccion = (endpoint ?? DIRECCION_POR_DEFECTO).replace(/\/+$/, '')
  try {
    const url = new URL(direccion)
    const delDominio = url.hostname === DOMINIO || url.hostname.endsWith(`.${DOMINIO}`)
    return url.protocol === 'https:' && delDominio && url.username === '' && url.password === ''
      ? direccion
      : null
  } catch {
    return null
  }
}

// --- apibara --------------------------------------------------------------------------------------

function codigoDeEstado(estado: number): Codigo {
  if (estado === 404) return 'no_encontrado'
  if (estado === 401 || estado === 403) return 'clave_invalida'
  if (estado === 429) return 'cuota'
  if (estado === 400 || estado === 422) return 'no_soportado'
  return 'proveedor'
}

const dormir = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

// Un pedido con su tope de tiempo y, ante un 5xx o un corte, un solo reintento. Un 429 no se
// reintenta: la cuota no vuelve en medio segundo.
async function pedir(url: string, clave: string, intento = 1): Promise<Response | Codigo> {
  try {
    const respuesta = await fetch(url, {
      headers: { 'X-API-Key': clave, Accept: 'application/json, image/*' },
      signal: AbortSignal.timeout(ESPERA_MS),
    })
    if (respuesta.status >= 500 && intento === 1) {
      await respuesta.body?.cancel()
      await dormir(400)
      return pedir(url, clave, 2)
    }
    return respuesta
  } catch (error) {
    if (intento === 1) {
      await dormir(400)
      return pedir(url, clave, 2)
    }
    return error instanceof DOMException && error.name === 'TimeoutError' ? 'tiempo' : 'proveedor'
  }
}

async function consultarFicha(
  base: string,
  clave: string,
  entrada: string,
  plataformas: string[],
): Promise<Resultado> {
  let ruta: string
  const delEnlace = /^https?:\/\//i.test(entrada) ? plataformaDeEnlace(entrada) : null
  if (/^https?:\/\//i.test(entrada)) {
    if (delEnlace === null) return { ok: false, codigo: 'no_soportado' }
    if (!plataformas.includes(delEnlace)) return { ok: false, codigo: 'plataforma' }
    ruta = `/vehicles/urltodetails?url=${encodeURIComponent(entrada)}`
  } else if (PATRON_DE_VIN.test(entrada.toUpperCase()) || PATRON_DE_LOTE.test(entrada)) {
    ruta = `/vehicles/${encodeURIComponent(entrada.toUpperCase())}`
  } else {
    return { ok: false, codigo: 'entrada' }
  }
  const respuesta = await pedir(`${base}${ruta}`, clave)
  if (typeof respuesta === 'string') return { ok: false, codigo: respuesta }
  if (!respuesta.ok) {
    await respuesta.body?.cancel()
    return { ok: false, codigo: codigoDeEstado(respuesta.status) }
  }
  const cuerpo = (await respuesta.json().catch(() => null)) as { data?: unknown } | null
  const data = cuerpo?.data
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, codigo: 'proveedor' }
  }
  const plataforma = String((data as Record<string, unknown>)['platform'] ?? '').toLowerCase()
  if (plataforma !== '' && !plataformas.includes(plataforma))
    return { ok: false, codigo: 'plataforma' }
  // La API no repite la dirección (devuelve `url: true`): la que se consultó es la que se pegó.
  return { ok: true, cuerpo: { data, url: delEnlace === null ? null : entrada } }
}

// La ficha queda en la base a nombre de quien consultó: el alta y el refresco la referencian por
// id. Si no se puede guardar (demasiado grande, la base no responde), la ficha no sirve para
// guardar el vehículo y se dice como un problema de la consulta.
async function guardarConsulta(usuario: string | null, origen: string, data: unknown) {
  if (usuario === null || !UUID.test(usuario)) return null
  try {
    const id = await rpc<string>(
      'apibara_consulta_guardar',
      { p_usuario: usuario, p_origen: origen, p_raw: data },
      comoServicio,
    )
    return typeof id === 'string' && UUID.test(id) ? id : null
  } catch {
    return null
  }
}

async function consultarFoto(base: string, clave: string, direccion: string): Promise<Resultado> {
  let url: URL
  try {
    url = new URL(direccion)
  } catch {
    return { ok: false, codigo: 'entrada' }
  }
  if (url.protocol !== 'https:' || !HOSTS_DE_FOTO.includes(url.hostname.toLowerCase())) {
    return { ok: false, codigo: 'entrada' }
  }
  const respuesta = await pedir(`${base}/image-proxy?url=${encodeURIComponent(direccion)}`, clave)
  if (typeof respuesta === 'string') return { ok: false, codigo: respuesta }
  if (!respuesta.ok) {
    await respuesta.body?.cancel()
    return { ok: false, codigo: codigoDeEstado(respuesta.status) }
  }
  if (!(respuesta.headers.get('content-type') ?? '').startsWith('image/')) {
    await respuesta.body?.cancel()
    return { ok: false, codigo: 'proveedor' }
  }
  const bytes = new Uint8Array(await respuesta.arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > PESO_MAXIMO_DE_FOTO) {
    return { ok: false, codigo: 'proveedor' }
  }
  return { ok: true, cuerpo: null, binario: bytes }
}

// De /usage sólo lo que la pantalla muestra: ni el cuerpo entero ni nada de la cuenta.
async function consultarUso(base: string, clave: string): Promise<Resultado> {
  const respuesta = await pedir(`${base}/usage`, clave)
  if (typeof respuesta === 'string') return { ok: false, codigo: respuesta }
  if (!respuesta.ok) {
    await respuesta.body?.cancel()
    return { ok: false, codigo: codigoDeEstado(respuesta.status) }
  }
  const cuerpo = (await respuesta.json().catch(() => null)) as { data?: Record<string, any> } | null
  const d = cuerpo?.data
  if (!d) return { ok: false, codigo: 'proveedor' }
  const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return {
    ok: true,
    cuerpo: {
      plan: typeof d['plan']?.['name'] === 'string' ? d['plan']['name'] : null,
      usadas: numero(d['quota']?.['used']),
      limite: numero(d['quota']?.['limit']),
      restantes: numero(d['quota']?.['left']),
      hasta: typeof d['period']?.['quota_to'] === 'string' ? d['period']['quota_to'] : null,
    },
  }
}

// --- Entrada --------------------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: { codigo: 'entrada' } }, 405)
  }
  const pedido = leerPedido(await req.json().catch(() => null))
  if (pedido === null) return fallo('entrada')

  // 1. Qué puede esta persona. La base lo responde con su sesión; sin sesión válida el contexto
  //    llega vacío (`aplica: false`) y no se lee ninguna clave.
  let contexto: Contexto
  try {
    contexto = await rpc<Contexto>(
      'apibara_contexto',
      { p_origen: pedido.accion === 'uso' ? null : pedido.origen },
      comoQuienLlama(req),
    )
  } catch {
    return fallo('sin_permiso')
  }
  if (pedido.accion === 'uso') {
    // El uso es de la empresa, no de un origen: se mira si puede gestionar sus ajustes.
    const gestiona = contexto.puede_ver_uso === true
    if (!gestiona) return fallo('sin_permiso')
  } else {
    if (!contexto.aplica || !contexto.activa) return fallo('apagada')
    if (!contexto.puede_crear && !contexto.puede_editar) return fallo('sin_permiso')
  }

  // 2. La dirección y la clave. La dirección sólo puede ser de apibara.tech: ahí viaja la clave.
  const base = direccionDeApibara(contexto.endpoint)
  if (base === null) return fallo('apagada')
  let clave: string | null
  try {
    clave = await rpc<string | null>('integracion_secreto', { p_clave: 'apibara' }, comoServicio)
  } catch {
    return fallo('proveedor')
  }
  if (!clave) return fallo('apagada')

  // 3. La consulta.
  let resultado: Resultado
  if (pedido.accion === 'ficha') {
    resultado = await consultarFicha(base, clave, pedido.entrada, contexto.plataformas)
  } else if (pedido.accion === 'foto') {
    resultado = await consultarFoto(base, clave, pedido.url)
  } else {
    resultado = await consultarUso(base, clave)
  }
  // Sin datos personales: sólo qué se pidió y cómo terminó.
  console.log(
    JSON.stringify({
      accion: pedido.accion,
      ok: resultado.ok,
      codigo: resultado.ok ? null : resultado.codigo,
    }),
  )

  if (!resultado.ok) return fallo(resultado.codigo)
  if (pedido.accion === 'ficha') {
    const { data, url } = resultado.cuerpo as { data: unknown; url: string | null }
    const consulta = await guardarConsulta(contexto.usuario, pedido.origen, data)
    if (consulta === null) return fallo('proveedor')
    return json({ ok: true, data: { consulta, data, url } })
  }
  if (resultado.binario) {
    return new Response(resultado.binario, {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  }
  return json({ ok: true, data: resultado.cuerpo })
})
