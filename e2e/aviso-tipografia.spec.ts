import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { irAFicha, ponerExtras } from './soporte/leads-ficha'
import { nacional } from './soporte/leads-ficha-telefonos'
import { limpiarRecorrido, prepararRecorrido, type TerrenoDelRecorrido } from './soporte/recorrido'

// Los avisos (sonner) usan la tipografía de la app, no la del sistema (cierre 2): sonner inyecta su propio `font-family` y le
// ganaba a la que hereda de `<html>`. Se compara la fuente calculada del aviso con la del cuerpo, en claro y en oscuro.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'Tipografia')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

for (const esquema of ['light', 'dark'] as const) {
  test(`el aviso lleva la tipografía de la app (${esquema})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: esquema })
    await ponerExtras(r.dos.id, [{ telefono: `${r.t.codigo}${nacional()}`, etiqueta: 'Casa' }])
    await entrar(page, r.ana.email)
    await irAFicha(page, r.dos.id)
    await page.getByRole('button', { name: 'Quitar' }).click()
    const aviso = page.locator('[data-sonner-toast]').filter({ hasText: 'Teléfono quitado.' })
    await expect(aviso).toBeVisible()
    const fuentes = await aviso.evaluate((el) => ({
      aviso: getComputedStyle(el).fontFamily,
      cuerpo: getComputedStyle(document.body).fontFamily,
    }))
    expect(fuentes.aviso).toBe(fuentes.cuerpo)
    // Y la de la app es Geist, no la del sistema.
    expect(fuentes.aviso.toLowerCase()).toContain('geist')
  })
}
