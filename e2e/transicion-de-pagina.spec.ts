import { CONTRASENA } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { entrarConSesion } from './soporte/pasos'
import { expect, test, type Page } from './soporte/prueba'

// La transición entre pantallas (9.12-4, `docs/PLAN.md` › 9.12): un fundido con `--dur-pagina`, apagado con `prefers-reduced-motion`.
// La guarda `scripts/guardas/estados-de-ruta.test.ts` fija el CSS; aquí se ve en el navegador: la duración que vale cada token y qué
// animaciones de la transición corren al navegar de cliente (sin `goto`, que recarga y no hace transición).
let duena = ''

test.beforeAll(async ({}, info) => {
  duena = correoDePrueba(`duena-transicion-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Tránsito Pagina' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

async function navegarDeCliente(page: Page, ruta: string): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __animaciones: string[] }
    w.__animaciones = []
    const mirar = () => {
      for (const a of document.getAnimations()) {
        const nombre = (a as CSSAnimation).animationName
        if (
          typeof nombre === 'string' &&
          nombre.startsWith('pagina-') &&
          !w.__animaciones.includes(nombre)
        ) {
          w.__animaciones.push(nombre)
        }
      }
      requestAnimationFrame(mirar)
    }
    requestAnimationFrame(mirar)
  })
  await page.goto('/')
  await page.evaluate((destino) => {
    ;(window as unknown as { next: { router: { push(r: string): void } } }).next.router.push(
      destino,
    )
  }, ruta)
  await expect.poll(() => new URL(page.url()).pathname).toBe(ruta)
  await page.waitForLoadState('networkidle')
}

// El navegador normaliza la duración de un token a segundos («280ms» llega como «0.28s»): se compara en milisegundos.
const duracion = (page: Page, token: string) =>
  page.evaluate((t) => {
    const valor = getComputedStyle(document.documentElement).getPropertyValue(t).trim()
    return valor.endsWith('ms') ? parseFloat(valor) : parseFloat(valor) * 1000
  }, token)

test('E2E T1 con movimiento normal la página entra con su duración', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await entrarConSesion(page, duena, CONTRASENA)
  await navegarDeCliente(page, '/leads')
  expect(await duracion(page, '--dur-pagina')).toBeCloseTo(280)
  expect(await duracion(page, '--dur-rapida')).toBeCloseTo(120)
  const animaciones = await page.evaluate(
    () => (window as unknown as { __animaciones: string[] }).__animaciones,
  )
  expect(animaciones).not.toEqual([])
})

test('E2E T2 con movimiento reducido no corre ninguna animación de página', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await entrarConSesion(page, duena, CONTRASENA)
  await navegarDeCliente(page, '/leads')
  expect(await duracion(page, '--dur-pagina')).toBe(0)
  expect(await duracion(page, '--dur-rapida')).toBe(0)
  const animaciones = await page.evaluate(
    () => (window as unknown as { __animaciones: string[] }).__animaciones,
  )
  expect(animaciones).toEqual([])
})
