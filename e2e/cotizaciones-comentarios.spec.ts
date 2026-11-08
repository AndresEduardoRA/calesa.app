import { entrar } from './soporte/alta'
import { sembrarConTitulos } from './soporte/cotizaciones-papelera'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { literal, sql } from './soporte/sql'

// Los comentarios de una cotización guardada (paso 4.27-2, `docs/UX.md` › «Cotización: comentarios»): la sección «Comentarios» bajo la hoja lee al llegar a la
// pantalla; se comenta, se responde (un nivel), se edita lo propio («(editado)») y se borra con su diálogo por la URL (`?panel=borrar-comentario`). Una raíz con
// respuestas queda «Comentario eliminado.» y se va con su última respuesta. Lo que se ve al recargar es lo que hay en la base. Permisos, versión y candados ya
// tienen sus pruebas SQL (`supabase/tests/areas/comentarios/`).

let t: Awaited<ReturnType<typeof prepararGuardado>>

test.beforeAll(async ({}, info) => {
  t = await prepararGuardado(info.project.name, 'comentarios')
})

test.afterAll(async () => {
  await limpiarGuardado()
})

// Baja hasta la sección (lee recién al estar a la vista) y la devuelve.
async function seccionDeComentarios(page: Page): Promise<Locator> {
  const seccion = page.getByRole('region', { name: 'Comentarios' })
  await seccion.getByRole('heading', { name: 'Comentarios' }).scrollIntoViewIfNeeded()
  return seccion
}

const enLaBase = (cotizacionId: string): string =>
  sql(`
    select coalesce(string_agg(case when eliminado_en is null then cuerpo else '(eliminado)' end
                               || case when padre_id is null then '' else ' ↳' end, ' | ' order by creado_en), '')
      from public.cotizaciones_comentarios where cotizacion_id = ${literal(cotizacionId)}::uuid`)

test('E2E comentar, responder, editar y borrar', async ({ page }) => {
  const [id = ''] = sembrarConTitulos({
    origenId: t.origen.id,
    creadoPor: t.duena,
    titulos: ['Con comentarios'],
  })
  await entrar(page, t.duena, { fresco: true })
  await page.goto(`/cotizaciones/${id}`)
  let seccion = await seccionDeComentarios(page)
  await expect(seccion.getByText('Todavía no hay comentarios.', { exact: true })).toBeVisible()

  const nuevo = seccion.getByRole('textbox', { name: 'Escribe un comentario' })
  await nuevo.fill('Primer comentario')
  await seccion.getByRole('button', { name: 'Comentar' }).click()
  await expect(seccion.getByText('Primer comentario', { exact: true })).toBeVisible()
  await expect(nuevo).toHaveValue('')

  await seccion.getByRole('button', { name: 'Responder tu comentario' }).click()
  await seccion.getByRole('textbox', { name: 'Escribe una respuesta' }).fill('Una respuesta')
  await seccion.getByRole('button', { name: 'Responder', exact: true }).click()
  await expect(seccion.getByText('Una respuesta', { exact: true })).toBeVisible()

  // La raíz va primero: su «Editar» es el primero.
  await seccion.getByRole('button', { name: 'Editar tu comentario' }).first().click()
  await seccion
    .getByRole('textbox', { name: 'Edita tu comentario' })
    .fill('Primer comentario, corregido')
  await seccion.getByRole('button', { name: 'Guardar' }).click()
  await expect(seccion.getByText('Primer comentario, corregido', { exact: true })).toBeVisible()
  await expect(seccion.getByText('(editado)', { exact: true })).toBeVisible()
  await expect.poll(() => enLaBase(id)).toBe('Primer comentario, corregido | Una respuesta ↳')

  await page.reload()
  seccion = await seccionDeComentarios(page)
  await expect(seccion.getByText('Primer comentario, corregido', { exact: true })).toBeVisible()
  await expect(seccion.getByText('(editado)', { exact: true })).toBeVisible()
  await expect(seccion.getByText('Una respuesta', { exact: true })).toBeVisible()

  await seccion.getByRole('button', { name: 'Borrar tu comentario' }).first().click()
  await expect(page).toHaveURL(/panel=borrar-comentario/)
  const dialogo = page.getByRole('dialog', { name: 'Borrar tu comentario' })
  await expect(dialogo.getByText(/Las respuestas quedan\./)).toBeVisible()
  await dialogo.getByRole('button', { name: 'Borrar', exact: true }).click()
  await expect(dialogo).toBeHidden()
  await expect(page).not.toHaveURL(/panel=borrar-comentario/)
  await expect(seccion.getByText('Comentario eliminado.', { exact: true })).toBeVisible()
  await expect(seccion.getByText('Una respuesta', { exact: true })).toBeVisible()
  await expect.poll(() => enLaBase(id)).toBe('(eliminado) | Una respuesta ↳')

  // La última respuesta de una raíz eliminada se la lleva.
  await seccion.getByRole('button', { name: 'Borrar tu comentario' }).click()
  await page
    .getByRole('dialog', { name: 'Borrar tu comentario' })
    .getByRole('button', { name: 'Borrar', exact: true })
    .click()
  await expect(seccion.getByText('Todavía no hay comentarios.', { exact: true })).toBeVisible()
  await expect.poll(() => enLaBase(id)).toBe('')

  await page.reload()
  seccion = await seccionDeComentarios(page)
  await expect(seccion.getByText('Todavía no hay comentarios.', { exact: true })).toBeVisible()
})
