// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  entorno,
} from './soporte/base'
import { CLAVE, entrar, limpiarInventario, prepararInventario } from './soporte/inventario'
import { literal, sql } from './soporte/sql'

// Guías con el editor (8.03-1): la dueña arma una guía con un título, una lista y un enlace, la guarda, la publica y la lee un visitante (`web.guias`
// como `anon`); quien gestiona el contenido pero no publica ve «Publicar» apagado con su motivo y sí guarda. La lista blanca y los permisos de la
// base los prueban `supabase/tests/areas/web/guias-publicar.sql` y `doc.test.ts`. Las guías de este spec llevan el prefijo `e2e-guia-` en su dirección.
test.describe.configure({ mode: 'serial' })

const TITULO = 'E2E Guía del Corolla'
const SLUG = 'e2e-guia-del-corolla'
const ENLACE = 'https://ejemplo.test/x'

let duena = ''
let soloGestiona = ''

const borrarGuiasDePrueba = () => {
  sql("delete from public.web_guias where slug like 'e2e-guia-%'")
}

test.beforeAll(async ({}, info) => {
  borrarGuiasDePrueba()
  const terreno = await prepararInventario(info.project.name, [
    'web.contenido.gestionar',
    'web.guias.publicar',
  ])
  duena = terreno.duena
  soloGestiona = correoDePrueba(`solo-gestiona-${info.project.name}`)
  await crearPersona({
    email: soloGestiona,
    contrasena: CLAVE,
    nombre: 'Gabriela Contenido',
    invitada: true,
  })
  await darRolDePrueba({
    email: soloGestiona,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Contenido ${info.project.name}`,
      clave: `e2e_contenido_${info.project.name}`,
    },
    permisos: ['web.contenido.gestionar'],
  })
})

test.afterAll(async () => {
  borrarGuiasDePrueba()
  await limpiarInventario()
})

// Lo que ve un visitante del sitio: la clave pública, sin sesión.
async function guiaPublica(slug: string): Promise<{ cuerpo_html: string; titulo: string } | null> {
  const visitante = createClient(
    entorno('NEXT_PUBLIC_SUPABASE_URL'),
    entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data, error } = await visitante
    .schema('web')
    .from('guias')
    .select('titulo, cuerpo_html')
    .eq('slug', slug)
    .returns<{ titulo: string; cuerpo_html: string }[]>()
  if (error) {
    throw new Error(`No se pudo leer web.guias: ${error.message}`)
  }
  return data[0] ?? null
}

const editor = (page: Page) => page.getByRole('textbox', { name: 'Texto', exact: true })

async function escribirLaGuia(page: Page) {
  await editor(page).click()
  await page.keyboard.type('## Pasos para importar')
  await page.keyboard.press('Enter')
  await page.keyboard.type('- Elegir el vehículo')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Pagar el flete')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type(`Más en ${ENLACE} `)
}

test('la dueña escribe una guía con título, lista y enlace, la guarda, la publica y la despublica', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion')
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Sitio web/ })
    .click()
  await page.getByRole('tab', { name: 'Guías' }).click()
  await expect(page.getByRole('heading', { name: 'Guías', level: 2 })).toBeVisible()

  await page.getByRole('button', { name: 'Nueva guía' }).click()
  await page.getByLabel('Título', { exact: true }).fill(TITULO)
  await expect(page.getByLabel('Dirección', { exact: true })).toHaveValue(SLUG)
  await page.getByRole('button', { name: 'Crear borrador' }).click()
  await expect(page).toHaveURL(/\/configuracion\/web\/guias\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: TITULO, level: 1 })).toBeVisible()
  await expect(page.getByText('Borrador', { exact: true })).toBeVisible()

  await escribirLaGuia(page)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Guía guardada')).toBeVisible()
  const guardado = sql(
    `select cuerpo_doc::text from public.web_guias where slug = ${literal(SLUG)}`,
  )
  expect(guardado).toContain('"heading"')
  expect(guardado).toContain('"bulletList"')
  expect(guardado).toContain(ENLACE)
  expect(await guiaPublica(SLUG)).toBeNull()

  await page.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(page.getByText('Guía publicada')).toBeVisible()
  const visible = await guiaPublica(SLUG)
  expect(visible?.titulo).toBe(TITULO)
  expect(visible?.cuerpo_html).toContain('<h2>Pasos para importar</h2>')
  expect(visible?.cuerpo_html).toContain('<ul><li><p>Elegir el vehículo</p></li>')
  expect(visible?.cuerpo_html).toContain(`<a href="${ENLACE}" rel="noopener noreferrer nofollow">`)

  await page.getByRole('button', { name: 'Despublicar', exact: true }).click()
  await expect(page.getByText('Guía despublicada')).toBeVisible()
  expect(await guiaPublica(SLUG)).toBeNull()
})

test('quien gestiona el contenido sin publicar ve «Publicar» apagado con su motivo y sí guarda', async ({
  page,
}) => {
  const slug = 'e2e-guia-sin-publicar'
  sql(
    `insert into public.web_guias (titulo, slug, cuerpo_doc) values ('E2E Guía sin publicar', ${literal(slug)}, '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Texto inicial"}]}]}'::jsonb)`,
  )
  const id = sql(`select id from public.web_guias where slug = ${literal(slug)}`)
  await entrar(page, soloGestiona)
  await page.goto(`/configuracion/web/guias/${id}`)
  await expect(page.getByRole('heading', { name: 'E2E Guía sin publicar', level: 1 })).toBeVisible()

  await expect(page.getByRole('button', { name: 'Publicar', exact: true })).toBeDisabled()
  await expect(page.getByText('Tu rol no publica guías.')).toBeVisible()

  await editor(page).click()
  await page.keyboard.press('End')
  await page.keyboard.type(' y más texto')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Guía guardada')).toBeVisible()
  expect(
    sql(
      `select (cuerpo_doc::text like '%y más texto%') || '|' || (publicada_en is null) from public.web_guias where slug = ${literal(slug)}`,
    ),
  ).toBe('true|true')
})
