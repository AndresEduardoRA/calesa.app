import { entrar } from './soporte/alta'
import { sembrarConTitulos } from './soporte/cotizaciones-papelera'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { expect, test, type Page } from './soporte/prueba'
import { literal, sql } from './soporte/sql'

// Favorita, reportar y moderar una cotización guardada (paso 4.27-4, `docs/UX.md` › «Cotización: comentarios»): en la cabecera, la estrella
// «Favorita», «Reportar…» (`?panel=reportar`) y, para quien modera, «Invalidar…», «Descartar los reportes…» y «Reactivar…» (`?panel=moderar&accion=…`), con la
// insignia «Reportada» o «Inválida». La dueña modera. Permisos, versión y candados ya tienen sus pruebas SQL (`supabase/tests/areas/comentarios/`).

let t: Awaited<ReturnType<typeof prepararGuardado>>

test.beforeAll(async ({}, info) => {
  t = await prepararGuardado(info.project.name, 'moderar')
})

test.afterAll(async () => {
  await limpiarGuardado()
})

const cabecera = (page: Page) => page.locator('[data-cabecera-de-la-guardada]')

// El estado, cuántos reportes y si es favorita (sólo la dueña la marca), como lo dice la base.
const enLaBase = (cotizacionId: string): string =>
  sql(`
    select c.estado || ' · ' || (select count(*) from public.cotizaciones_reportes r where r.cotizacion_id = c.id)
           || ' · ' || exists(select 1 from public.cotizaciones_favoritos f where f.cotizacion_id = c.id)
      from public.cotizaciones c where c.id = ${literal(cotizacionId)}::uuid`)

test('E2E favorita, reportar, invalidar y reactivar', async ({ page }) => {
  const [id = ''] = sembrarConTitulos({
    origenId: t.origen.id,
    creadoPor: t.duena,
    titulos: ['Para moderar'],
  })
  await entrar(page, t.duena, { fresco: true })
  await page.goto(`/cotizaciones/${id}`)
  const arriba = cabecera(page)
  await expect(arriba.getByRole('heading', { name: /Cotización n\.º/ })).toBeVisible()

  // Favorita: cambia al tocar y la base la guarda.
  const estrella = arriba.getByRole('button', { name: 'Favorita' })
  await expect(estrella).toHaveAttribute('aria-pressed', 'false')
  await estrella.click()
  await expect(estrella).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => enLaBase(id)).toBe('activa · 0 · true')

  // Sin reportes, quien modera puede invalidar, pero no descartar.
  await expect(arriba.getByRole('button', { name: 'Invalidar…' })).toBeVisible()
  await expect(arriba.getByRole('button', { name: 'Descartar los reportes…' })).toHaveCount(0)

  // Reportar con un motivo.
  await arriba.getByRole('button', { name: 'Reportar…' }).click()
  await expect(page).toHaveURL(/panel=reportar/)
  const modal = page.getByRole('dialog', { name: /Reportar la cotización n\.º/ })
  await modal.getByRole('textbox', { name: '¿Qué está mal?' }).fill('El precio no cuadra')
  await modal.getByRole('button', { name: 'Enviar el reporte' }).click()
  await expect(modal).toBeHidden()
  await expect(page.getByText('Reporte enviado.', { exact: true })).toBeVisible()
  await expect(arriba.getByRole('button', { name: 'Reportaste esta cotización…' })).toBeVisible()
  await expect(arriba.getByText('Reportada', { exact: true })).toBeVisible()
  await expect(arriba.getByRole('button', { name: 'Descartar los reportes…' })).toBeVisible()
  await expect.poll(() => enLaBase(id)).toBe('activa · 1 · true')

  // Invalidar: el Confirmar muestra el motivo; los reportes se conservan.
  await arriba.getByRole('button', { name: 'Invalidar…' }).click()
  await expect(page).toHaveURL(/panel=moderar&accion=invalidar/)
  const confirmar = page.getByRole('dialog', { name: /Invalidar la cotización n\.º/ })
  await expect(confirmar.getByText('El precio no cuadra', { exact: true })).toBeVisible()
  await confirmar.getByRole('button', { name: 'Invalidar', exact: true }).click()
  await expect(confirmar).toBeHidden()
  await expect(page).not.toHaveURL(/panel=moderar/)
  await expect(arriba.getByText('Inválida', { exact: true })).toBeVisible()
  await expect(arriba.getByText('Reportada', { exact: true })).toHaveCount(0)
  await expect.poll(() => enLaBase(id)).toBe('invalida · 1 · true')

  // Recargar lo conserva.
  await page.reload()
  await expect(arriba.getByText('Inválida', { exact: true })).toBeVisible()
  await expect(arriba.getByRole('button', { name: 'Favorita' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // Reactivar: vuelve a valer y se borran sus reportes.
  await arriba.getByRole('button', { name: 'Reactivar…' }).click()
  const reactivar = page.getByRole('dialog', { name: /Reactivar la cotización n\.º/ })
  await reactivar.getByRole('button', { name: 'Reactivar', exact: true }).click()
  await expect(reactivar).toBeHidden()
  await expect(arriba.getByText('Inválida', { exact: true })).toHaveCount(0)
  await expect(arriba.getByRole('button', { name: 'Reportar…' })).toBeVisible()
  await expect(arriba.getByRole('button', { name: 'Invalidar…' })).toBeVisible()
  await expect.poll(() => enLaBase(id)).toBe('activa · 0 · true')
})
