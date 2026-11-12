// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from './soporte/prueba'
import { admin, entorno } from './soporte/base'
import { entrar, limpiarInventario, prepararInventario } from './soporte/inventario'
import { sql } from './soporte/sql'

// Legales con el editor (8.03-2): la dueña escribe los términos con un título y un párrafo, los guarda entrando por el hub y un visitante los lee
// (`web.ajustes` como `anon`); la privacidad, sin texto, no se crea. La validación y los permisos los prueba `supabase/tests/areas/web/ajustes-guardar.sql`.
// `ajustes_web` es una fila que otros specs leen: se restaura al final (un solo worker).
test.describe.configure({ mode: 'serial' })

type Guardado = { legales: unknown; actualizado_por: string | null }

let duena = ''
let antes: Guardado | null = null

test.beforeAll(async ({}, info) => {
  const terreno = await prepararInventario(info.project.name, ['web.ajustes.gestionar'])
  duena = terreno.duena
  // Después de preparar: su limpieza ya soltó un autor de prueba que hubiera dejado una corrida cortada.
  antes = JSON.parse(
    sql(
      'select row_to_json(t) from (select legales, actualizado_por from public.ajustes_web where id = 1) t',
    ),
  ) as Guardado
  const { error } = await admin().from('ajustes_web').update({ legales: {} }).eq('id', 1)
  if (error) {
    throw new Error(`No se pudieron vaciar los legales: ${error.message}`)
  }
})

test.afterAll(async () => {
  if (antes) {
    const { error } = await admin().from('ajustes_web').update(antes).eq('id', 1)
    if (error) {
      throw new Error(`No se pudieron restaurar los legales: ${error.message}`)
    }
  }
  await limpiarInventario()
})

// Lo que ve un visitante del sitio: la clave pública, sin sesión.
async function legalesPublicos(): Promise<Record<string, { titulo: string; html: string }>> {
  const visitante = createClient(
    entorno('NEXT_PUBLIC_SUPABASE_URL'),
    entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data, error } = await visitante
    .schema('web')
    .from('ajustes')
    .select('legales')
    .returns<{ legales: Record<string, { titulo: string; html: string }> | null }[]>()
  if (error) {
    throw new Error(`No se pudo leer web.ajustes: ${error.message}`)
  }
  return data[0]?.legales ?? {}
}

const editorDeTerminos = (page: Page) =>
  page.getByRole('textbox', { name: 'Texto de los términos', exact: true })

test('la dueña guarda los términos y un visitante los lee; la privacidad sin texto no se crea', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion')
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Sitio web/ })
    .click()
  await page.getByRole('tab', { name: 'Legales' }).click()
  await expect(page.getByRole('heading', { name: 'Legales', level: 2 })).toBeVisible()

  await expect(page.locator('#terminos-titulo')).toHaveValue('Términos y condiciones')
  await expect(page.locator('#privacidad-titulo')).toHaveValue('Política de privacidad')
  // Los legales no llevan imágenes: la barra del editor no la ofrece.
  await expect(page.getByRole('button', { name: 'Elegir una imagen' })).toHaveCount(0)
  expect(await legalesPublicos()).toEqual({})

  await editorDeTerminos(page).click()
  await page.keyboard.type('## Condiciones')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Pagas al recibir.')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Legales guardados')).toBeVisible()

  const guardado = sql("select legales->'terminos'->>'html' from public.ajustes_web where id = 1")
  expect(guardado).toContain('<h2>Condiciones</h2>')
  const visibles = await legalesPublicos()
  expect(visibles['terminos']?.titulo).toBe('Términos y condiciones')
  expect(visibles['terminos']?.html).toContain('<h2>Condiciones</h2>')
  expect(visibles['terminos']?.html).toContain('Pagas al recibir.')
  expect(visibles['privacidad']).toBeUndefined()

  // Al volver a la pantalla el texto sigue.
  await page.reload()
  await expect(editorDeTerminos(page)).toContainText('Pagas al recibir.')
})
