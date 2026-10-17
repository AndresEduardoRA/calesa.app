import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import {
  admin,
  borrarPersonasDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  entorno,
} from './soporte/base'
import { ingresar } from './soporte/pasos'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// El avatar chico (cierre 1): al subir la foto se guardan dos tamaños (512 y 96 px); la lista del equipo dibuja la
// miniatura; y lo que ya existía lo rellena la edge function `avatares-miniaturas` (una persona dada de baja también;
// una imagen corrupta queda marcada y no se reintenta).
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const DUENA = 'Dalia Avatar'
let duena = ''
let baja = ''
let rota = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-avatar-${info.project.name}`)
  baja = correoDePrueba(`baja-avatar-${info.project.name}`)
  rota = correoDePrueba(`rota-avatar-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: DUENA })
  await crearPersona({ email: baja, contrasena: CLAVE, nombre: 'Berta Avatar', invitada: true })
  await crearPersona({ email: rota, contrasena: CLAVE, nombre: 'Rita Avatar', invitada: true })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

const idDe = (correo: string) =>
  sql(`select id from public.perfiles where email = ${literal(correo)}`)
const rutasDe = (correo: string) =>
  sql(`select coalesce(avatar_ruta, '') || '|' || coalesce(avatar_miniatura_ruta, '') || '|' ||
              coalesce(avatar_miniatura_fallo_en::text, '') from public.perfiles where email = ${literal(correo)}`).split(
    '|',
  )

// Una imagen hecha en el navegador (un lienzo de `ancho` × `alto` con un degradé), como bytes.
async function imagen(page: Page, ancho: number, alto: number, tipo: string): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ({ ancho, alto, tipo }) => {
      const lienzo = new OffscreenCanvas(ancho, alto)
      const ctx = lienzo.getContext('2d')
      if (!ctx) throw new Error('sin 2d')
      const degradado = ctx.createLinearGradient(0, 0, ancho, alto)
      degradado.addColorStop(0, '#465fff')
      degradado.addColorStop(1, '#12b76a')
      ctx.fillStyle = degradado
      ctx.fillRect(0, 0, ancho, alto)
      const blob = await lienzo.convertToBlob({ type: tipo })
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let texto = ''
      for (const b of bytes) texto += String.fromCharCode(b)
      return btoa(texto)
    },
    { ancho, alto, tipo },
  )
  return Buffer.from(base64, 'base64')
}

async function medidasPublicas(page: Page, ruta: string): Promise<{ ancho: number; alto: number }> {
  const url = `${entorno('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')}/storage/v1/object/public/avatares/${ruta}`
  return page.evaluate(async (u) => {
    const r = await fetch(u)
    if (!r.ok) throw new Error(`no está: ${String(r.status)}`)
    const mapa = await createImageBitmap(await r.blob())
    return { ancho: mapa.width, alto: mapa.height }
  }, url)
}

async function entrar(page: Page) {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
}

test('una foto enorme se guarda en 512 y en 96 px; un archivo roto lo dice y no cambia nada', async ({
  page,
}, info) => {
  await entrar(page)
  await page.goto('/perfil')
  // Un archivo que no es una imagen.
  await page.getByLabel('Elegir una foto de perfil').setInputFiles({
    name: 'foto.png',
    mimeType: 'image/png',
    buffer: Buffer.from('esto no es una imagen'),
  })
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(
    page.getByText('No se pudo leer esa imagen. Prueba con otra (JPG, PNG o WebP).'),
  ).toBeVisible()
  expect(rutasDe(duena)[0]).toBe('')
  // Una de 20 MP.
  await page.getByLabel('Elegir una foto de perfil').setInputFiles({
    name: 'enorme.png',
    mimeType: 'image/png',
    buffer: await imagen(page, 5000, 4000, 'image/png'),
  })
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Perfil guardado')).toBeVisible({ timeout: 30_000 })
  const [grande, chica] = rutasDe(duena)
  expect(grande).not.toBe('')
  expect(chica).not.toBe('')
  expect(await medidasPublicas(page, grande ?? '')).toEqual({ ancho: 512, alto: 410 })
  expect(await medidasPublicas(page, chica ?? '')).toEqual({ ancho: 96, alto: 77 })
  await capturar(page, info, 'perfil-con-foto')
})

test('el relleno hace la miniatura de lo que ya existía, también de alguien dado de baja, y marca la imagen rota', async ({
  page,
}, info) => {
  await entrar(page)
  const [idBaja, idRota] = [idDe(baja), idDe(rota)]
  const avatar = `${idBaja}/${'a'.repeat(64)}.webp`
  const rotaRuta = `${idRota}/${'b'.repeat(64)}.webp`
  const almacen = admin().storage.from('avatares')
  expect(
    (
      await almacen.upload(avatar, await imagen(page, 512, 512, 'image/webp'), {
        contentType: 'image/webp',
        upsert: true,
      })
    ).error,
  ).toBeNull()
  expect(
    (
      await almacen.upload(rotaRuta, Buffer.from('RIFF0000WEBProto'), {
        contentType: 'image/webp',
        upsert: true,
      })
    ).error,
  ).toBeNull()
  sql(`update public.perfiles set avatar_ruta = ${literal(avatar)}, activo = false, baja_en = now() where id = ${literal(idBaja)};
       update public.perfiles set avatar_ruta = ${literal(rotaRuta)} where id = ${literal(idRota)}`)

  const pase = sql('insert into public.cola_gc_pases default values returning pase')
  const respuesta = await fetch(
    `${entorno('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')}/functions/v1/avatares-miniaturas`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pase }),
    },
  )
  const cuerpo = (await respuesta.json()) as {
    ok: boolean
    data?: { hechas: number; fallidas: number }
  }
  expect(respuesta.status, JSON.stringify(cuerpo)).toBe(200)
  expect(cuerpo.data?.hechas).toBeGreaterThanOrEqual(1)

  const [, chica] = rutasDe(baja)
  expect(chica).toMatch(new RegExp(`^${idBaja}/[0-9a-f]{64}\\.webp$`))
  expect(await medidasPublicas(page, chica ?? '')).toEqual({ ancho: 96, alto: 96 })
  const [, sinMiniatura, fallo] = rutasDe(rota)
  expect(sinMiniatura).toBe('')
  expect(fallo).not.toBe('')
  // El mismo pase no vale dos veces.
  const otra = await fetch(
    `${entorno('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')}/functions/v1/avatares-miniaturas`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pase }),
    },
  )
  expect(otra.status).toBe(403)

  // La lista del equipo dibuja la miniatura (la de quien se dio de baja, en «Dadas de baja»).
  await page.goto('/configuracion/equipo')
  await page.getByLabel('Estado').selectOption('baja')
  const fila = page.getByRole('row').filter({ hasText: 'Berta Avatar' })
  await expect(fila.getByRole('img', { name: 'Berta Avatar' })).toHaveAttribute(
    'src',
    new RegExp(chica ?? 'x'),
  )
  // La imagen rota: sin miniatura, la lista intenta el avatar y, como no carga, muestra las iniciales.
  await page.getByLabel('Estado').selectOption('vigentes')
  const filaRota = page.getByRole('row').filter({ hasText: 'Rita Avatar' })
  await expect(filaRota.getByRole('img', { name: 'Rita Avatar' })).toHaveText('RA')
  await capturar(page, info, 'equipo-con-miniaturas')
})
