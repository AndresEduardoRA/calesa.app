import { expect, test, type Page, type TestInfo } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { irAlEmbudo } from './soporte/leads-oportunidades'
import {
  capturar,
  limpiarRecorrido,
  prepararRecorrido,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'

// El recorrido del cierre 4 con la dueña y una asesora (la de la semilla): los modales que ahora preguntan al descartar (nuevo rol,
// invitar, nuevo embudo, etiquetas), lo que dicen junto al campo y sin conexión, en claro y en oscuro, con el texto normal y al 200 %,
// en escritorio y en el celular. Las capturas (`E2E_CAPTURAS=e2e-capturas/cierre-4`) se miran con las hojas de contacto
// (`node scripts/hoja-de-contacto.mjs`); lo que se puede afirmar sin mirar está en `modales-con-salida.spec.ts`.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'Cierre cuatro')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

// Claro, oscuro y, si se pide, claro con el texto al 200 %.
async function variantes(page: Page, info: TestInfo, nombreDeCaptura: string, al200 = false) {
  await page.emulateMedia({ colorScheme: 'light' })
  await capturar(page, info, `${nombreDeCaptura}-claro`)
  await page.emulateMedia({ colorScheme: 'dark' })
  await capturar(page, info, `${nombreDeCaptura}-oscuro`)
  await page.emulateMedia({ colorScheme: 'light' })
  if (al200) {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    await capturar(page, info, `${nombreDeCaptura}-200`)
    await page.evaluate(() => {
      document.documentElement.style.fontSize = ''
    })
  }
}

test('Dalia · nuevo rol: vacío, un nombre sin letras y la pregunta al descartar', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  await page.goto('/configuracion/roles')
  await page.getByRole('button', { name: 'Nuevo rol' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nuevo rol' })
  await expect(dialogo.getByLabel('Nombre del rol')).toBeFocused()
  await capturar(page, info, 'dalia-nuevo-rol-vacio')

  await dialogo.getByLabel('Nombre del rol').fill('1234')
  await dialogo.getByRole('button', { name: 'Crear rol' }).click()
  await expect(
    dialogo.getByText('Usa un nombre con letras, como «Ventas» o «Logística».'),
  ).toBeVisible()
  await variantes(page, info, 'dalia-nuevo-rol-sin-letras', true)

  await dialogo.getByLabel('Nombre del rol').fill('Rol que no se crea')
  await page.keyboard.press('Escape')
  await expect(dialogo.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await variantes(page, info, 'dalia-nuevo-rol-pregunta', true)
})

test('Dalia · invitar: el rol que falta se dice junto al campo y la pregunta al descartar', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  await page.goto('/configuracion/equipo')
  await page.getByRole('button', { name: 'Invitar' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Invitar a una persona' })
  await dialogo.getByLabel('Correo', { exact: true }).fill('invitada.del.recorrido@ejemplo.com')
  await dialogo.getByRole('button', { name: 'Invitar' }).click()
  await expect(dialogo.getByText('Elige el rol con el que entra.')).toBeVisible()
  await variantes(page, info, 'dalia-invitar-sin-rol', true)

  await page.keyboard.press('Escape')
  await expect(dialogo.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await variantes(page, info, 'dalia-invitar-pregunta', true)
})

test('Ana · nuevo embudo: la pregunta al descartar y lo escrito sin conexión', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irAlEmbudo(page)
  await page.getByRole('button', { name: 'Nuevo embudo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nuevo embudo' })
  await dialogo.getByLabel('Nombre').fill('Embudo del recorrido')
  await page.keyboard.press('Escape')
  await expect(dialogo.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await variantes(page, info, 'ana-nuevo-embudo-pregunta', true)
  await dialogo.getByRole('button', { name: 'Seguir editando' }).click()

  await page.context().setOffline(true)
  await expect(dialogo.getByText(/No hay conexión/)).toBeVisible()
  await capturar(page, info, 'ana-nuevo-embudo-sin-red')
  await dialogo.getByRole('button', { name: 'Crear embudo' }).click()
  await expect(dialogo.getByText(/se va a guardar solo/)).toBeVisible()
  await variantes(page, info, 'ana-nuevo-embudo-esperando', true)
  await page.context().setOffline(false)
  await expect(dialogo).toBeHidden()
})

test('Ana · etiquetas: la pregunta al cerrar con un nombre sin crear', async ({ page }, info) => {
  await entrar(page, r.ana.email)
  await page.goto('/leads?panel=etiquetas')
  const dialogo = page.getByRole('dialog', { name: 'Tus etiquetas' })
  await expect(dialogo).toBeVisible()
  await capturar(page, info, 'ana-etiquetas-vacio')
  await dialogo.getByLabel('Nombre de la etiqueta nueva').fill('Etiqueta del recorrido')
  await page.keyboard.press('Escape')
  await expect(dialogo.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await variantes(page, info, 'ana-etiquetas-pregunta', true)
})
