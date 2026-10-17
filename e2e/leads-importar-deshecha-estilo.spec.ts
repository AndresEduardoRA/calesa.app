import { expect, test } from './soporte/prueba'
import { entrar, limpiarAlta, prepararAlta, type PersonasDelAlta } from './soporte/alta'
import { borrarLeadsDePrueba } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { borrarLotesDePrueba } from './soporte/papelera'

// «Deshecha» en «Tus importaciones recientes» tiene un solo estilo (cierre 2): el estado de una insignia cambia de golpe, no se anima
// el color. Con `transition-all` la palabra nueva se veía unos cuadros con el color de «Terminada» (gris) y recién después en el suyo
// (azul): dos estilos para el mismo estado. Se muestrea el color cuadro a cuadro desde antes de confirmar.
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar = async () => {}

test.beforeAll(async ({}, info) => {
  const terreno = await prepararAlta(`${info.project.name}-deshecha`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarLotesDePrueba()
  await limpiarAlta(restaurar)
})

for (const esquema of ['light', 'dark'] as const) {
  test(`«Deshecha» sale con un solo color desde el primer cuadro (${esquema})`, async ({
    page,
  }, info) => {
    const nombre = `E2E Deshecha Estilo ${esquema} ${info.project.name}`
    await page.emulateMedia({ colorScheme: esquema })
    await entrar(page, esquema === 'light' ? personas.berta : personas.carlos)
    await page.goto('/leads/importar')
    const archivo = Buffer.from(
      `﻿Nombre;Teléfono\r\n${nombre} 1;${telefonoAlAzar()}\r\n${nombre} 2;${telefonoAlAzar()}\r\n`,
      'utf8',
    )
    await page.locator('input[type=file]').setInputFiles({
      name: 'leads.csv',
      mimeType: 'text/csv',
      buffer: archivo,
    })
    await page.getByRole('button', { name: 'Ver la vista previa' }).click()
    await page.getByRole('button', { name: 'Importar 2 leads' }).click()
    await expect(page.getByText('Entraron 2 leads a tu cartera.')).toBeVisible()
    await page.reload()
    const fila = page
      .getByRole('region', { name: 'Tus importaciones recientes' })
      .getByRole('listitem')
      .filter({ hasText: '2 importados' })
    await fila.getByRole('button', { name: 'Deshacer importación' }).click()
    const confirmar = page
      .getByRole('dialog', { name: 'Deshacer la importación' })
      .getByRole('button', { name: 'Mover a la papelera' })
    // Desde antes de confirmar, cada cuadro anota el texto y el color de la insignia de la fila.
    await page.evaluate(() => {
      const muestras: string[] = []
      ;(window as unknown as { __muestras: string[] }).__muestras = muestras
      const fotograma = () => {
        for (const insignia of document.querySelectorAll('[data-slot=badge]')) {
          if (insignia.textContent === 'Deshecha') {
            muestras.push(getComputedStyle(insignia).backgroundColor)
          }
        }
        requestAnimationFrame(fotograma)
      }
      requestAnimationFrame(fotograma)
    })
    await confirmar.click()
    await expect(fila.getByText('Deshecha')).toBeVisible()
    await expect(fila.getByText('Se movieron 2 leads a la papelera.')).toBeVisible()
    // Un rato después (la insignia ya se dibujó), todas las muestras de «Deshecha» tienen el mismo color.
    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __muestras: string[] }).__muestras.length),
      )
      .toBeGreaterThan(20)
    const colores = await page.evaluate(() => [
      ...new Set((window as unknown as { __muestras: string[] }).__muestras),
    ])
    expect(colores, `«Deshecha» se vio con más de un color: ${colores.join(' · ')}`).toHaveLength(1)
  })
}
