import { test, expect } from './soporte/prueba'
import { otorgarComo } from './soporte/leads-portal'
import {
  cookieDelPortal,
  ipAlAzar,
  limpiarPortalPorHttp,
  pedir,
  prepararPortalPorHttp,
  type TerrenoDelPortalPorHttp,
} from './soporte/portal-api'

// @sin-celular-archivo: no tiene interfaz: son pedidos HTTP con request de Playwright, sin pantalla

// El portal del cliente por HTTP (8.07-3): `api/portal/*` como lo llamará el sitio, que reescribe esas rutas hacia el CRM. Ingreso
// sin oráculo (clave mala y código inexistente dan lo mismo), la cookie firmada, el estado sin VIN completo, el documento por URL
// firmada, la clave, salir, «Volver a otorgar» que corta la cookie vieja y el límite por IP. Cada prueba con su IP (`ipAlAzar`).
test.describe.configure({ mode: 'serial' })

const CLAVE_1 = 'clave-portal-uno'
const CLAVE_2 = 'clave-portal-dos'
const CLAVE_3 = 'clave-portal-tres'
const CODIGO_INEXISTENTE = 'ZZZ-22222'

let terreno: TerrenoDelPortalPorHttp | undefined
let cookie = ''

const tr = () => {
  if (!terreno) throw new Error('Falta el terreno del portal.')
  return terreno
}

test.beforeAll(async ({}, info) => {
  terreno = await prepararPortalPorHttp(`api_${info.project.name}`, CLAVE_1)
})

test.afterAll(async () => {
  await limpiarPortalPorHttp(terreno)
})

test('el ingreso: Origin obligatorio, el mismo 401 para todo fallo y la cookie firmada', async ({
  playwright,
  baseURL,
}) => {
  const base = baseURL ?? ''
  const ip = ipAlAzar()
  const ingresar = (cuerpo: unknown, origen: string | null = base) =>
    pedir(playwright, base, '/api/portal/ingresar', { metodo: 'POST', ip, origen, cuerpo })

  const sinOrigen = await ingresar({ codigo: tr().codigo, clave: CLAVE_1 }, null)
  expect(sinOrigen.status).toBe(403)
  const ajeno = await ingresar({ codigo: tr().codigo, clave: CLAVE_1 }, 'https://ajeno.invalid')
  expect(ajeno.status).toBe(403)

  const claveMala = await ingresar({ codigo: tr().codigo, clave: 'no-es-la-clave' })
  const codigoInexistente = await ingresar({ codigo: CODIGO_INEXISTENTE, clave: CLAVE_1 })
  expect(claveMala.status).toBe(401)
  expect(codigoInexistente.status).toBe(401)
  expect(codigoInexistente.texto).toBe(claveMala.texto)
  expect(claveMala.cookies).toEqual([])

  const bien = await ingresar({ codigo: tr().codigo, clave: CLAVE_1 })
  expect(bien.status).toBe(200)
  expect(bien.cabecera('cache-control')).toBe('no-store')
  const cuerpo = JSON.parse(bien.texto) as Record<string, unknown>
  expect(cuerpo).toEqual({ nombre: expect.any(String), debe_cambiar_clave: expect.any(Boolean) })
  expect(bien.texto).not.toContain(tr().leadId)
  const puesta = cookieDelPortal(bien)
  expect(puesta?.valor).toBeTruthy()
  expect(puesta?.atributos).toEqual(
    expect.arrayContaining([
      'httponly',
      'secure',
      'samesite=lax',
      'path=/api/portal',
      'max-age=604800',
    ]),
  )
  cookie = puesta?.valor ?? ''
})

test('el estado trae el vehículo con el VIN parcial, nunca el completo; sin cookie, 401', async ({
  playwright,
  baseURL,
}) => {
  const base = baseURL ?? ''
  const estado = await pedir(playwright, base, '/api/portal/estado', { cookie })
  expect(estado.status).toBe(200)
  const { vin } = tr()
  const datos = JSON.parse(estado.texto) as { vehiculos: { id: string; vin_parcial: string }[] }
  expect(datos.vehiculos.find((v) => v.id === tr().vehiculoId)?.vin_parcial).toBe(
    `${vin.slice(0, 3)}•••••${vin.slice(-4)}`,
  )
  expect(estado.texto).not.toContain(vin)

  const sinCookie = await pedir(playwright, base, '/api/portal/estado')
  expect(sinCookie.status).toBe(401)
})

test('el documento: 302 a una URL firmada que da el mismo PDF; un id que no es guid, 404', async ({
  playwright,
  baseURL,
}) => {
  const base = baseURL ?? ''
  const doc = await pedir(playwright, base, `/api/portal/documentos/${tr().documentoId}`, {
    cookie,
  })
  expect(doc.status).toBe(302)
  const destino = doc.cabecera('location') ?? ''
  expect(destino).toContain('/storage/v1/object/sign/documentos/')
  expect(destino).toContain('token=')
  expect(doc.texto).toBe('')

  const archivo = await pedir(playwright, base, destino)
  expect(archivo.status).toBe(200)
  expect(archivo.bytes.equals(tr().pdf)).toBe(true)

  const malo = await pedir(playwright, base, '/api/portal/documentos/no-es-un-id', { cookie })
  expect(malo.status).toBe(404)
})

test('cambiar la clave deja la sesión; salir borra la cookie', async ({ playwright, baseURL }) => {
  const base = baseURL ?? ''
  const ip = ipAlAzar()
  const clave = await pedir(playwright, base, '/api/portal/clave', {
    metodo: 'POST',
    ip,
    origen: base,
    cookie,
    cuerpo: { actual: CLAVE_1, nueva: CLAVE_2 },
  })
  expect(clave.status).toBe(200)
  expect((await pedir(playwright, base, '/api/portal/estado', { cookie })).status).toBe(200)

  const salir = await pedir(playwright, base, '/api/portal/salir', {
    metodo: 'POST',
    ip,
    origen: base,
    cookie,
  })
  expect(salir.status).toBe(204)
  expect(cookieDelPortal(salir)?.atributos).toContain('max-age=0')
})

test('«Volver a otorgar» deja la cookie vieja en 401 y la borra', async ({
  playwright,
  baseURL,
}) => {
  await otorgarComo(tr().t.pia.email, tr().leadId, CLAVE_3)
  const vieja = await pedir(playwright, baseURL ?? '', '/api/portal/estado', { cookie })
  expect(vieja.status).toBe(401)
  expect(cookieDelPortal(vieja)?.atributos).toContain('max-age=0')
})

test('el límite por IP: diez intentos dan 401 y el once, 429 con Retry-After', async ({
  playwright,
  baseURL,
}) => {
  const base = baseURL ?? ''
  const ip = ipAlAzar()
  const intento = () =>
    pedir(playwright, base, '/api/portal/ingresar', {
      metodo: 'POST',
      ip,
      origen: base,
      cuerpo: { codigo: CODIGO_INEXISTENTE, clave: 'cualquiera' },
    })
  for (let n = 1; n <= 10; n++) expect((await intento()).status, `intento ${n}`).toBe(401)
  const once = await intento()
  expect(once.status).toBe(429)
  expect(once.cabecera('retry-after')).toBe('900')
})
