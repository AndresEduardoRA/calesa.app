import { expect, test, type Locator, type Page } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { ingresar } from './soporte/pasos'

// 5a-24: el cuerpo de un modal que se desplaza dice que sigue. Con el texto al 200 % el selector de iconos de «Nuevo tipo de seguimiento»
// no cabe (539 px de cuerpo en 438 en escritorio, 908 en 452 en el celular) y la rejilla asomaba cortada sobre el pie sin nada que dijera
// que hay más. Ahora hay un degradado abajo mientras queda algo por ver, uno arriba cuando ya se desplazó, y ninguno si el cuerpo cabe.

const CLAVE = 'una-clave-de-prueba-9'

let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-modal-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Modal' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

async function abrirElSelector(page: Page, tamano: '' | '200%'): Promise<Locator> {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
  await page.goto('/configuracion/leads?seccion=seguimientos')
  await page.evaluate((t) => {
    document.documentElement.style.fontSize = t
  }, tamano)
  await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
  const modal = page.getByRole('dialog', { name: 'Nuevo tipo de seguimiento' })
  await expect(modal).toBeVisible()
  return modal
}

// El cuerpo del modal es lo que se desplaza: se lo encuentra por lo que hace, no por cómo está escrito.
const medirElCuerpo = (modal: Locator) =>
  modal.evaluate((d) => {
    const cuerpo = [...d.querySelectorAll<HTMLElement>('*')].find(
      (e) => getComputedStyle(e).overflowY === 'auto',
    )
    return cuerpo
      ? { desborda: cuerpo.scrollHeight > cuerpo.clientHeight + 1, alto: cuerpo.scrollHeight }
      : null
  })

const alFinal = (modal: Locator) =>
  modal.evaluate((d) => {
    const cuerpo = [...d.querySelectorAll<HTMLElement>('*')].find(
      (e) => getComputedStyle(e).overflowY === 'auto',
    )
    if (cuerpo) cuerpo.scrollTop = cuerpo.scrollHeight
  })

const alPrincipio = (modal: Locator) =>
  modal.evaluate((d) => {
    const cuerpo = [...d.querySelectorAll<HTMLElement>('*')].find(
      (e) => getComputedStyle(e).overflowY === 'auto',
    )
    if (cuerpo) cuerpo.scrollTop = 0
  })

test('al 200 %: el cuerpo desborda y dice que sigue; al llegar al final, dice que hay más arriba', async ({
  page,
}) => {
  const modal = await abrirElSelector(page, '200%')
  expect((await medirElCuerpo(modal))?.desborda, 'el cuerpo del modal desborda al 200 %').toBe(true)
  const abajo = modal.locator('[data-desborde="abajo"]')
  const arriba = modal.locator('[data-desborde="arriba"]')
  await expect(abajo).toHaveAttribute('data-visible', 'true')
  await expect(arriba).toHaveAttribute('data-visible', 'false')
  await alFinal(modal)
  await expect(abajo).toHaveAttribute('data-visible', 'false')
  await expect(arriba).toHaveAttribute('data-visible', 'true')
  await alPrincipio(modal)
  await expect(abajo).toHaveAttribute('data-visible', 'true')
  await expect(arriba).toHaveAttribute('data-visible', 'false')
  // La pista no se come el clic: lo que está debajo se toca igual (`pointer-events-none`).
  const pista = await abajo.evaluate((e) => getComputedStyle(e).pointerEvents)
  expect(pista).toBe('none')
})

test('al 100 %: el cuerpo cabe y ninguna pista se ve', async ({ page }) => {
  const modal = await abrirElSelector(page, '')
  expect((await medirElCuerpo(modal))?.desborda, 'el cuerpo del modal cabe al 100 %').toBe(false)
  await expect(modal.locator('[data-desborde="abajo"]')).toHaveAttribute('data-visible', 'false')
  await expect(modal.locator('[data-desborde="arriba"]')).toHaveAttribute('data-visible', 'false')
})
