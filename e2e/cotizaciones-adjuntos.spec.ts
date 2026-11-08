import { entrar } from './soporte/alta'
import { sembrarConTitulos } from './soporte/cotizaciones-papelera'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { literal, sql } from './soporte/sql'

// Los adjuntos de una cotización guardada (paso 4.27-3, `docs/UX.md` › «Cotización: comentarios»): el bloque «Adjuntos» dentro de la sección «Comentarios» sube al
// bucket privado por hash (la imagen, como WebP), registra por action, baja por una URL firmada al tocar «Descargar» y quita con su diálogo por la URL
// (`?panel=quitar-adjunto`). Recorre las policies de `storage.objects` de punta a punta (subir pide poder adjuntar; firmar, ver). Permisos, tope, duplicado y
// carpeta ya tienen sus pruebas SQL (`supabase/tests/areas/comentarios/adjuntos*.sql`). No se borra la cola de limpieza: el PDF quitado lo barre `storage-gc`.

let t: Awaited<ReturnType<typeof prepararGuardado>>

test.beforeAll(async ({}, info) => {
  t = await prepararGuardado(info.project.name, 'adjuntos')
})

test.afterAll(async () => {
  await limpiarGuardado()
})

// Un PDF mínimo y un PNG de 1 × 1: el bucket mira el tipo, no el contenido; la imagen la convierte el navegador.
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n')
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

async function seccionDeComentarios(page: Page): Promise<Locator> {
  const seccion = page.getByRole('region', { name: 'Comentarios' })
  await seccion.getByRole('heading', { name: 'Comentarios' }).scrollIntoViewIfNeeded()
  return seccion
}

const enLaBase = (cotizacionId: string): string =>
  sql(`
    select coalesce(string_agg(nombre || ' ' || mime || ' ' || (ruta ~ ('^' || cotizacion_id || '/[0-9a-f]{64}\\.(pdf|webp)$'))::text, ' | '
                               order by nombre), '')
      from public.cotizaciones_adjuntos where cotizacion_id = ${literal(cotizacionId)}::uuid`)

const enLaCola = (cotizacionId: string): string =>
  sql(`
    select coalesce(string_agg(substring(ruta from '\\.([a-z]+)$'), ',' order by ruta), '')
      from public.cola_gc_storage where bucket = 'cotizaciones' and ruta like ${literal(`${cotizacionId}/%`)}`)

test('E2E adjuntar, descargar y quitar', async ({ page }) => {
  const [id = ''] = sembrarConTitulos({
    origenId: t.origen.id,
    creadoPor: t.duena,
    titulos: ['Con adjuntos'],
  })
  await entrar(page, t.duena, { fresco: true })
  await page.goto(`/cotizaciones/${id}`)
  let seccion = await seccionDeComentarios(page)
  await expect(seccion.getByText('Todavía no hay adjuntos.', { exact: true })).toBeVisible()

  await seccion.locator('input[type=file]').setInputFiles([
    { name: 'presupuesto.pdf', mimeType: 'application/pdf', buffer: PDF },
    { name: 'foto.png', mimeType: 'image/png', buffer: PNG },
  ])
  await expect(seccion.getByRole('button', { name: 'Descargar presupuesto.pdf' })).toBeVisible()
  await expect(seccion.getByRole('button', { name: 'Descargar foto.webp' })).toBeVisible()
  await expect
    .poll(() => enLaBase(id))
    .toBe('foto.webp image/webp true | presupuesto.pdf application/pdf true')

  const descarga = page.waitForEvent('download')
  await seccion.getByRole('button', { name: 'Descargar presupuesto.pdf' }).click()
  expect((await descarga).suggestedFilename()).toBe('presupuesto.pdf')

  await seccion.getByRole('button', { name: 'Quitar presupuesto.pdf' }).click()
  await expect(page).toHaveURL(/panel=quitar-adjunto/)
  const dialogo = page.getByRole('dialog', { name: 'Quitar presupuesto.pdf' })
  await dialogo.getByRole('button', { name: 'Quitar', exact: true }).click()
  await expect(dialogo).toBeHidden()
  await expect(page).not.toHaveURL(/panel=quitar-adjunto/)
  await expect(seccion.getByRole('button', { name: 'Descargar presupuesto.pdf' })).toBeHidden()
  await expect.poll(() => enLaBase(id)).toBe('foto.webp image/webp true')
  await expect.poll(() => enLaCola(id)).toBe('pdf')

  await page.reload()
  seccion = await seccionDeComentarios(page)
  await expect(seccion.getByRole('button', { name: 'Descargar foto.webp' })).toBeVisible()
  await expect(seccion.getByText('presupuesto.pdf')).toHaveCount(0)
})
