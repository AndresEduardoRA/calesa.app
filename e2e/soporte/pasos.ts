// Pasos que repiten los e2e, dichos como los haría una persona: por etiquetas y roles accesibles.
import { expect, type BrowserContext, type Page } from '@playwright/test'

// En la pantalla de ingreso.
export async function ingresar(page: Page, correo: string, contrasena: string): Promise<void> {
  await page.getByLabel('Correo').fill(correo)
  await page.getByLabel('Contraseña').fill(contrasena)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

// Entrar a la app y quedar en `/`. La PRIMERA vez que se entra con una cuenta se hace por la pantalla de
// ingreso, como una persona; las siguientes, dentro del mismo proceso de Playwright, reusan las cookies de
// esa sesión en el contexto nuevo del test. Reusar es sólo un atajo para no pagar el ingreso en cada test:
//
// - El ingreso real lo prueban `acceso.spec.ts` (con `ingresar`, sin caché) y los specs que tienen su
//   propio `entrar` por interfaz (equipo, empresa, orígenes, configuración de leads), que son los que
//   bloquean, cambian de rol o abren un registro. Un test que cambie a la persona o su acceso a mitad de
//   camino pide `{ fresco: true }`.
// - Los permisos se leen de la base en cada pedido, no del token: una sesión guardada no deja permisos viejos.
// - Si la sesión guardada ya no sirve (caducó, la cuenta se borró o se bloqueó), `/` manda al ingreso: se
//   descarta y se entra por interfaz. Nunca se sigue con una sesión rota.
const VIGENCIA_MS = 30 * 60_000 // el token de acceso dura una hora: la caché, la mitad

type Cookies = Awaited<ReturnType<BrowserContext['cookies']>>
const sesiones = new Map<string, { cookies: Cookies; guardada: number }>()

export async function entrarConSesion(
  page: Page,
  correo: string,
  contrasena: string,
  opciones: { fresco?: boolean } = {},
): Promise<void> {
  const contexto = page.context()
  const guardada = opciones.fresco ? undefined : sesiones.get(correo)
  if (guardada && Date.now() - guardada.guardada < VIGENCIA_MS) {
    await contexto.addCookies(guardada.cookies)
    await page.goto('/')
    if (new URL(page.url()).pathname === '/') return
    sesiones.delete(correo)
    await contexto.clearCookies()
  }
  await page.goto('/ingreso')
  await ingresar(page, correo, contrasena)
  await expect(page).toHaveURL('/')
  sesiones.set(correo, { cookies: await contexto.cookies(), guardada: Date.now() })
}
