import { expect, test, type Locator, type Page } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { bloque, descartarAviso } from './soporte/inventario'
import { borrarCamposDeLeadDePrueba, campoDeLead, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { irAFicha, leadEnLaBase, panelDeEdicion } from './soporte/leads-ficha'
import { ingresar } from './soporte/pasos'

// @sin-celular-archivo: las pantallas de Configuración no llevan e2e en el celular (.claude/rules/e2e.md › «Pruebas: sólo lo clave»)

// El rango de un campo numérico (9-2, 9.04-3) contra la app compilada y el Supabase local: la dueña crea un campo con mínimo y
// máximo, lo acota con un lead ya cargado fuera (el aviso cuenta y no bloquea) y, en la ficha, el motivo sale al escribir un valor
// fuera; adentro se guarda. Al terminar se borra lo que se creó.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const ETIQUETA = 'E2E Puntaje'
const CLAVE_DEL_CAMPO = 'e2e_puntaje'

let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarCamposDeLeadDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-rango-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Prueba' })
})

test.afterAll(async () => {
  await borrarCamposDeLeadDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page) {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
}

// Un campo sin grupo va en «Otros datos», que puede nacer plegado.
async function abrirOtros(panel: Locator) {
  const encabezado = bloque(panel, 'Otros datos')
  if ((await encabezado.locator('xpath=..').getAttribute('open')) === null) {
    await encabezado.click()
  }
}

test('un campo con rango avisa al acotarlo y la ficha dice el motivo', async ({ page }) => {
  await entrar(page)
  await page.goto('/configuracion/leads')

  // Crear: «Mínimo» y «Máximo» aparecen al elegir «Número».
  await page.getByRole('button', { name: 'Nuevo campo' }).click()
  const panel = page.getByRole('dialog')
  await panel.getByLabel('Nombre', { exact: true }).fill(ETIQUETA)
  await panel.getByLabel('Tipo').selectOption({ label: 'Número' })
  await panel.getByLabel('Mínimo', { exact: true }).fill('1')
  await panel.getByLabel('Máximo', { exact: true }).fill('10')
  await panel.getByRole('button', { name: 'Crear campo' }).click()
  await descartarAviso(page, `Campo «${ETIQUETA}» creado`)
  expect(await campoDeLead(CLAVE_DEL_CAMPO)).toMatchObject({
    tipo: 'numero',
    minimo: 1,
    maximo: 10,
  })

  // Un lead ya cargado con 8: bajar el máximo a 5 lo cuenta, avisa sin bloquear y se confirma.
  const leadId = await crearLead({
    nombre: 'Lead con puntaje',
    telefono: telefonoAlAzar(),
    deQuien: duena,
    atributos: { [CLAVE_DEL_CAMPO]: 8 },
  })
  await page.getByRole('button', { name: `Editar ${ETIQUETA}` }).click()
  const edicion = page.getByRole('dialog')
  await edicion.getByLabel('Máximo', { exact: true }).fill('5')
  await edicion.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(edicion.getByText(/^1 lead tiene un valor fuera de este rango\./)).toBeVisible()
  expect((await campoDeLead(CLAVE_DEL_CAMPO)).maximo).toBe(10)
  await edicion.getByRole('button', { name: 'Confirmar y guardar', exact: true }).click()
  await expect.poll(async () => (await campoDeLead(CLAVE_DEL_CAMPO)).maximo).toBe(5)

  // En la ficha: 7 queda fuera y dice el motivo (el 8 de la base no cambia); 4 se guarda.
  await irAFicha(page, leadId, '?panel=editar-lead')
  const ficha = panelDeEdicion(page)
  await expect(ficha).toBeVisible()
  await abrirOtros(ficha)
  await ficha.getByLabel(ETIQUETA).fill('7')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(ficha.getByText(`«${ETIQUETA}» va de 1 a 5.`)).toBeVisible()
  expect((await leadEnLaBase(leadId)).atributos[CLAVE_DEL_CAMPO]).toBe(8)
  await ficha.getByLabel(ETIQUETA).fill('4')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados')).toBeVisible()
  await expect.poll(async () => (await leadEnLaBase(leadId)).atributos[CLAVE_DEL_CAMPO]).toBe(4)
})
