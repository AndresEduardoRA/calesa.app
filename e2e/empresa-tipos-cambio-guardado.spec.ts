import { expect, test } from './soporte/prueba'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import {
  restaurarEmpresa,
  tomarInstantaneaDeEmpresa,
  type InstantaneaDeEmpresa,
} from './soporte/empresa'
import { ingresar } from './soporte/pasos'

// @sin-celular-archivo: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)

// El panel de un tipo de cambio no pierde lo que se teclea alrededor de guardar (cierre 2): el aviso «guardado» sale antes de que
// el panel se dibuje con lo guardado y el formulario se reemplaza (`key` con la versión), así que mientras guarda y hasta que llega
// lo guardado los campos están apagados; lo que se teclea en cuanto se pueden editar sobrevive. Igual que Empresa (`empresa-guardado.spec.ts`).
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'

let duena = ''
let antes: InstantaneaDeEmpresa

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  antes = await tomarInstantaneaDeEmpresa()
  await restaurarEmpresa()
  duena = correoDePrueba(`duena-tipos-cambio-guardado-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Cambios' })
})

test.afterAll(async () => {
  await restaurarEmpresa(antes)
  await borrarPersonasDePrueba()
})

test('mientras guarda no se puede teclear, y lo que se teclea al llegar lo guardado sobrevive', async ({
  page,
}) => {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
  await page.goto('/configuracion/empresa?seccion=monedas')
  await page.getByRole('button', { name: /^Oficial/ }).click()
  const panel = page.getByRole('dialog')
  const valor = panel.getByLabel(/^Valor/)
  await valor.fill('7,21')

  let soltar = () => {}
  const retenida = new Promise<void>((resolver) => {
    soltar = resolver
  })
  await page.route(
    (url) => url.pathname === '/configuracion/empresa',
    async (ruta) => {
      if (ruta.request().method() === 'POST' && 'next-action' in ruta.request().headers()) {
        await retenida
      }
      await ruta.fallback()
    },
  )
  try {
    await panel.getByRole('button', { name: 'Guardar' }).click()
    await expect(panel.getByRole('button', { name: 'Guardando…' })).toBeVisible()
    await expect(valor).toBeDisabled()
    await expect(panel.getByLabel(/^Nombre/)).toBeDisabled()
  } finally {
    soltar()
  }
  await expect(page.getByText('Tipo de cambio «Oficial» guardado')).toBeVisible()

  // Se teclea apenas se puede: el campo es el de la pantalla ya dibujada con lo guardado, no el que está por irse.
  await valor.fill('7,22')
  const guardado = panel.getByRole('listitem').filter({ hasText: '7,21' })
  await expect(guardado.first()).toBeVisible()
  await expect(valor).toHaveValue('7,22')
  await expect(valor).toBeEnabled()
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(panel.getByRole('listitem').filter({ hasText: '7,22' }).first()).toBeVisible()
})
