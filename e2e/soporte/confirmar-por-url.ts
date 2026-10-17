// Lo que toda confirmación con su URL cumple (`.claude/rules/ui.md`): se abre con su `?panel=`, Esc la cierra y el foco vuelve al
// botón, «atrás» la cierra y «adelante» la reabre, la recarga la reabre, sin red lo dice y no deja confirmar, y un doble clic manda
// un solo pedido. Un spec lo recorre por cada confirmación con lo suyo (qué se abre, qué se confirma).
import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test'
import { demorarAcciones } from './recorrido'

type Ciclo = {
  // Pulsa lo que la abre.
  abrir: () => Promise<void>
  dialogo: Locator
  // El botón que la abrió: el foco vuelve ahí.
  disparador: Locator
  // La URL abierta.
  url: RegExp
}

// Abre, cierra con Esc, «atrás» y «adelante», y recarga: termina con la confirmación abierta.
export async function cicloDeUnaConfirmacion(page: Page, c: Ciclo): Promise<void> {
  await c.abrir()
  await expect(c.dialogo).toBeVisible()
  await expect(page).toHaveURL(c.url)
  await page.keyboard.press('Escape')
  await expect(c.dialogo).toBeHidden()
  await expect(page).not.toHaveURL(c.url)
  await expect(c.disparador).toBeFocused()
  await c.abrir()
  await expect(c.dialogo).toBeVisible()
  // nuqs escribe la URL un instante después de abrir: «atrás» sólo vale cuando ya está escrita.
  await expect(page).toHaveURL(c.url)
  await page.goBack()
  await expect(c.dialogo).toBeHidden()
  await page.goForward()
  await expect(c.dialogo).toBeVisible()
  await page.reload()
  await expect(c.dialogo).toBeVisible()
}

// Sin red: lo dice adentro y el botón de confirmar se apaga; con red vuelve.
export async function sinRedNoConfirma(
  context: BrowserContext,
  dialogo: Locator,
  confirmar: Locator,
): Promise<void> {
  await context.setOffline(true)
  await expect(dialogo.getByText(/No hay conexión/)).toBeVisible()
  await expect(confirmar).toBeDisabled()
  await context.setOffline(false)
  await expect(dialogo.getByText(/No hay conexión/)).toBeHidden()
  await expect(confirmar).toBeEnabled()
}

// Dos clics seguidos en confirmar: un solo pedido al servidor. Devuelve lo que salió (para mirar el resultado).
export async function dobleClicManda(page: Page, confirmar: Locator): Promise<number> {
  const enviadas = await demorarAcciones(page, 800)
  await confirmar.dblclick()
  return new Promise((resolver) => {
    setTimeout(() => {
      resolver(enviadas.length)
    }, 1500)
  })
}

// Una URL escrita a mano que no se puede abrir no abre nada: se avisa por qué y la URL se limpia.
export async function noAbre(
  page: Page,
  direccion: string,
  motivo: string | RegExp,
  url: RegExp,
): Promise<void> {
  await page.goto(direccion)
  await expect(page.getByText(motivo).first()).toBeVisible()
  await expect(
    page.getByRole('dialog').filter({ hasText: /Purgar|Salir|Eliminar|Deshacer/ }),
  ).toHaveCount(0)
  await expect(page).not.toHaveURL(url)
}
