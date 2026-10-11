// Pasos que repiten los e2e, dichos como los haría una persona: por etiquetas y roles accesibles.
import type { Page } from '@playwright/test'

// En la pantalla de ingreso.
export async function ingresar(page: Page, correo: string, contrasena: string): Promise<void> {
  await page.getByLabel('Correo').fill(correo)
  await page.getByLabel('Contraseña').fill(contrasena)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}
