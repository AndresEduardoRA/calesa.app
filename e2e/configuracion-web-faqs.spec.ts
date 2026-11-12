// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { admin } from './soporte/base'
import { entrar, limpiarInventario, prepararInventario } from './soporte/inventario'
import { cicloDeUnaConfirmacion } from './soporte/confirmar-por-url'
import { elegirDelMenu, masAccionesDe } from './soporte/lista-de-catalogo'
import { faqsPublicas } from './soporte/web-publica'

// Las preguntas frecuentes de Configuración › Sitio web (8.02-1): la dueña crea una (nace sin publicar y la web pública no la ve), la publica desde el
// panel (la web la trae con su categoría), crea otra y la sube (cambia el orden que ve la web), despublica desde el «⋯» (deja de verse) y elimina con el
// diálogo de su URL. El límite de permisos y las versiones están en `supabase/tests/areas/web/faqs-permisos.sql`.
test.describe.configure({ mode: 'serial' })

const PREFIJO = 'E2E 8.02'
let duena = ''
let proyecto = ''
const pregunta = (resto: string) => `${PREFIJO} ${resto} ${proyecto}`

async function borrarFaqsDePrueba(): Promise<void> {
  const { error } = await admin().from('web_faqs').delete().like('pregunta', `${PREFIJO}%`)
  if (error) {
    throw new Error(`No se pudieron borrar las preguntas de prueba: ${error.message}`)
  }
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  ;({ duena } = await prepararInventario(proyecto, ['web.contenido.gestionar']))
  await borrarFaqsDePrueba()
})

test.afterAll(async () => {
  await borrarFaqsDePrueba()
  await limpiarInventario()
})

const panel = (page: Page) => page.getByRole('dialog', { name: /pregunta$/ })

async function crear(page: Page, texto: string, respuesta: string, categoria: string) {
  await page.getByRole('button', { name: 'Nueva pregunta' }).click()
  await expect(page.getByRole('dialog', { name: 'Nueva pregunta' })).toBeVisible()
  await page.getByLabel('Pregunta', { exact: true }).fill(texto)
  await page.getByLabel('Respuesta', { exact: true }).fill(respuesta)
  await page.getByLabel('Categoría (opcional)').fill(categoria)
  await page.getByRole('button', { name: 'Crear pregunta' }).click()
  await expect(page.getByText('Pregunta creada.')).toBeVisible()
  await expect(panel(page)).toBeHidden()
}

test('crear, publicar, ordenar, despublicar y eliminar: lo que ve la web pública sigue a la lista', async ({
  page,
}) => {
  const primera = pregunta('Primera')
  const segunda = pregunta('Segunda')
  await entrar(page, duena)
  await page.goto('/configuracion')
  await page
    .getByRole('main')
    .getByRole('link', { name: /^Sitio web/ })
    .click()
  await expect(page).toHaveURL(/\/configuracion\/web$/)
  await page.getByRole('tab', { name: 'Preguntas frecuentes' }).click()
  await expect(page).toHaveURL(/seccion=faqs/)
  await expect(page.getByRole('heading', { name: 'Preguntas frecuentes', level: 2 })).toBeVisible()

  // Una pregunta nueva nace sin publicar: la lista lo dice y la web pública no la trae.
  await crear(page, primera, 'Sí, un año.', 'Garantía')
  await expect(page.getByRole('button', { name: `Abrir ${primera}`, exact: true })).toBeVisible()
  await expect(
    page.locator('tr, li').filter({ hasText: primera }).getByText('Sin publicar'),
  ).toBeVisible()
  expect(await faqsPublicas(PREFIJO)).toEqual([])

  // Publicarla desde el panel: la web la trae, con su categoría y su respuesta tal cual.
  await page.getByRole('button', { name: `Abrir ${primera}`, exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Editar pregunta' })).toBeVisible()
  await page.getByRole('switch', { name: 'Publicada' }).click()
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Pregunta guardada.')).toBeVisible()
  await expect(panel(page)).toBeHidden()
  const publicas = await faqsPublicas(PREFIJO)
  expect(publicas.map((f) => [f.pregunta, f.respuesta, f.categoria])).toEqual([
    [primera, 'Sí, un año.', 'Garantía'],
  ])

  // Una segunda pregunta nace al final; publicada y subida, la web la trae primero.
  await crear(page, segunda, 'Entre 30 y 45 días.', 'Envíos')
  await page.getByRole('button', { name: `Abrir ${segunda}`, exact: true }).click()
  await page.getByRole('switch', { name: 'Publicada' }).click()
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Pregunta guardada.')).toBeVisible()
  await expect(panel(page)).toBeHidden()
  expect((await faqsPublicas(PREFIJO)).map((f) => f.pregunta)).toEqual([primera, segunda])
  await page.getByRole('button', { name: `Subir ${segunda}`, exact: true }).click()
  await expect
    .poll(async () => (await faqsPublicas(PREFIJO)).map((f) => f.pregunta))
    .toEqual([segunda, primera])

  // Despublicar desde el «⋯»: deja de verse en la web.
  await elegirDelMenu(page, primera, 'Despublicar')
  await expect(page.getByText('Pregunta despublicada.')).toBeVisible()
  expect((await faqsPublicas(PREFIJO)).map((f) => f.pregunta)).toEqual([segunda])

  // Eliminar: el diálogo vive en su URL (Esc, atrás y adelante, recarga) y al confirmar la pregunta se va de la lista y de la base.
  const dialogo = page.getByRole('dialog', { name: `Eliminar la pregunta «${segunda}»` })
  await cicloDeUnaConfirmacion(page, {
    abrir: async () => {
      await elegirDelMenu(page, segunda, 'Eliminar')
    },
    dialogo,
    disparador: masAccionesDe(page, segunda),
    url: /panel=eliminar-faq&faq=/,
  })
  await dialogo.getByRole('button', { name: 'Eliminar pregunta' }).click()
  await expect(page.getByText('Pregunta eliminada.')).toBeVisible()
  await expect(dialogo).toBeHidden()
  await expect(page.getByRole('button', { name: `Abrir ${segunda}`, exact: true })).toBeHidden()
  expect(await faqsPublicas(PREFIJO)).toEqual([])
})
