import { expect, test, type Browser, type Page } from '@playwright/test'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
} from './soporte/base'
import { descartarAviso } from './soporte/inventario'
import { borrarCamposDeLeadDePrueba, campoDeLead, camposDeLead, crearLead } from './soporte/leads'
import { ingresar } from './soporte/pasos'

// Configuración › Leads › Campos contra la app compilada y el Supabase local. Una sola historia, en
// orden: los campos de fábrica, un campo propio que se crea, se ordena, se vuelve privado y se
// desactiva, y los casos no felices (con datos, sin permiso, dos personas a la vez). Al terminar se
// borra lo que se creó. Nunca se tocan los campos de fábrica: otros specs cargan leads.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const ETIQUETA = 'E2E Signo zodiacal'
const CLAVE_DEL_CAMPO = 'e2e_signo_zodiacal'

let duena = ''
let sinPermisos = ''

test.beforeAll(async ({}, info) => {
  await borrarCamposDeLeadDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-leads-${info.project.name}`)
  sinPermisos = correoDePrueba(`sinpermisos-leads-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Prueba' })
  await crearPersona({
    email: sinPermisos,
    contrasena: CLAVE,
    nombre: 'Sin Permisos',
    invitada: true,
  })
})

test.afterAll(async () => {
  await borrarCamposDeLeadDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// Otra persona, en su propio navegador (sus cookies no se mezclan con las de la dueña).
async function otraPersona(browser: Browser, page: Page): Promise<Page> {
  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  return contexto.newPage()
}

test('los campos de fábrica están, uno es privado y ninguno se elimina', async ({ page }) => {
  await entrar(page, duena)
  await page.goto('/configuracion')
  await page.getByRole('link', { name: /Leads/ }).click()
  await expect(page.getByRole('heading', { name: 'Leads', level: 1 })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Campos' })).toBeVisible()

  for (const etiqueta of ['Edad', 'Género', 'Ciudad', 'País', 'Dirección', 'Notas']) {
    await expect(page.getByRole('button', { name: `Editar ${etiqueta}` })).toBeVisible()
  }
  // La dirección nace «solo la cartera», como el teléfono; la ciudad, no.
  await expect(page.getByRole('switch', { name: 'Dirección: solo la cartera' })).toBeChecked()
  await expect(page.getByRole('switch', { name: 'Ciudad: solo la cartera' })).not.toBeChecked()

  // Un campo de fábrica se edita, pero no cambia de tipo ni se elimina.
  await page.getByRole('button', { name: 'Editar Edad' }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByLabel('Tipo')).toBeDisabled()
  await expect(panel.getByText('Es un campo de fábrica')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Eliminar campo' })).toHaveCount(0)
})

test('se crea un campo de opciones, se ordena, se vuelve privado y se desactiva', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/leads')

  await page.getByRole('button', { name: 'Nuevo campo' }).click()
  const panel = page.getByRole('dialog')
  await panel.getByLabel('Nombre', { exact: true }).fill(ETIQUETA)
  await panel.getByLabel('Tipo').selectOption({ label: 'Una opción' })
  await panel.getByLabel('Nueva opción').fill('Aries')
  await panel.getByLabel('Nueva opción').press('Enter')
  await panel.getByLabel('Nueva opción').fill('Leo')
  await panel.getByRole('button', { name: 'Agregar' }).click()
  await panel.getByLabel('Grupo').fill('Datos personales')
  await panel.getByRole('button', { name: 'Crear campo' }).click()
  await descartarAviso(page, `Campo «${ETIQUETA}» creado`)
  expect(await campoDeLead(CLAVE_DEL_CAMPO)).toMatchObject({
    tipo: 'opcion',
    grupo: 'Datos personales',
    solo_cartera: false,
    es_sistema: false,
    activo: true,
  })

  // Ordenar: el orden se cambia con botones; sube un lugar dentro de su grupo.
  const antes = (await camposDeLead()).map((campo) => campo.clave)
  expect(antes.indexOf(CLAVE_DEL_CAMPO)).toBeGreaterThan(antes.indexOf('genero'))
  await page.getByRole('button', { name: `Subir ${ETIQUETA}` }).click()
  await expect
    .poll(async () => {
      const claves = (await camposDeLead()).map((campo) => campo.clave)
      return claves.indexOf(CLAVE_DEL_CAMPO) < claves.indexOf('genero')
    })
    .toBe(true)

  // Marcarlo «solo la cartera» guarda solo, como cualquier bandera.
  const privado = page.getByRole('switch', { name: `${ETIQUETA}: solo la cartera` })
  await expect(privado).not.toBeChecked()
  await privado.click()
  await expect(privado).toBeChecked()
  await expect.poll(async () => (await campoDeLead(CLAVE_DEL_CAMPO)).solo_cartera).toBe(true)

  // Volverlo requerido avisa, dentro del panel, cuánto pedirá el alta rápida.
  await page.getByRole('button', { name: `Editar ${ETIQUETA}` }).click()
  const edicion = page.getByRole('dialog')
  await edicion.getByRole('switch', { name: 'Requerido' }).click()
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(
    edicion.getByText(/El alta rápida pedirá \d+ datos? además del teléfono y el nombre\./),
  ).toBeVisible()
  expect((await campoDeLead(CLAVE_DEL_CAMPO)).requerido).toBe(false)
  await edicion.getByRole('button', { name: 'Cancelar' }).click()

  // Desactivarlo lo saca del layout (el dato se conserva) y se puede reactivar.
  await page.getByRole('button', { name: `Editar ${ETIQUETA}` }).click()
  const desactivar = page.getByRole('dialog')
  await desactivar.getByRole('switch', { name: 'Activo' }).click()
  await desactivar.getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, `Campo «${ETIQUETA}» guardado`)
  await page.getByText(/Campos desactivados \(1\)/).click()
  await page.getByRole('button', { name: `Reactivar ${ETIQUETA}` }).click()
  await expect(page.getByText(`«${ETIQUETA}» reactivado`)).toBeVisible()
  await expect.poll(async () => (await campoDeLead(CLAVE_DEL_CAMPO)).activo).toBe(true)

  // Lo que se guardó sobrevive a recargar.
  await page.reload()
  await expect(page.getByRole('switch', { name: `${ETIQUETA}: solo la cartera` })).toBeChecked()
})

test('un campo con datos no cambia de tipo ni se elimina: se desactiva', async ({ page }) => {
  await crearLead({
    nombre: 'Lead con signo',
    telefono: '70099001',
    deQuien: duena,
    atributos: { [CLAVE_DEL_CAMPO]: 'leo' },
  })
  await entrar(page, duena)
  await page.goto('/configuracion/leads')
  await page.getByRole('button', { name: `Editar ${ETIQUETA}` }).click()
  const panel = page.getByRole('dialog')

  // Cambiar el tipo: la base lo rechazaría, y la pantalla lo cuenta antes con números.
  await panel.getByLabel('Tipo').selectOption({ label: 'Texto' })
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(panel.getByText(/1 lead ya tiene un valor en «E2E Signo zodiacal»/)).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  expect((await campoDeLead(CLAVE_DEL_CAMPO)).tipo).toBe('opcion')
  await panel.getByRole('button', { name: 'Cancelar' }).click()

  // Eliminar: dice cuántos lo usan y manda a desactivar.
  await page.getByRole('button', { name: `Editar ${ETIQUETA}` }).click()
  const eliminar = page.getByRole('dialog')
  await eliminar.getByRole('button', { name: 'Eliminar campo' }).click()
  await expect(eliminar.getByText(/1 lead tiene un valor en «E2E Signo zodiacal»/)).toBeVisible()
  await expect(eliminar.getByRole('button', { name: 'Sí, eliminar el campo' })).toBeDisabled()
  expect((await campoDeLead(CLAVE_DEL_CAMPO)).activo).toBe(true)
})

test('sin el permiso no se entra y la tarjeta no aparece', async ({ page }) => {
  await entrar(page, sinPermisos)
  await page.goto('/configuracion/leads')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await page.goto('/configuracion')
  await expect(page.getByRole('link', { name: /Leads/ })).toHaveCount(0)
})

test('dos personas editando el mismo campo: la segunda ve el conflicto', async ({
  page,
  browser,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/leads')
  await page.getByRole('button', { name: `Editar ${ETIQUETA}` }).click()
  const primera = page.getByRole('dialog')
  await primera.getByLabel('Nombre', { exact: true }).fill('E2E Signo')

  // La segunda guarda primero.
  const segunda = await otraPersona(browser, page)
  await segunda.goto('/ingreso')
  await ingresar(segunda, duena, CLAVE)
  await expect(segunda).toHaveURL('/')
  await segunda.goto('/configuracion/leads')
  await segunda.getByRole('button', { name: `Editar ${ETIQUETA}` }).click()
  const edicion = segunda.getByRole('dialog')
  await edicion.getByLabel('Nombre', { exact: true }).fill('E2E Signo del zodiaco')
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  // El aviso nombra el campo como estaba; lo guardado es el nombre nuevo.
  await expect(segunda.getByText(`Campo «${ETIQUETA}» guardado`)).toBeVisible()

  // La primera todavía tiene la versión vieja en pantalla.
  await primera.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Otra persona cambió este campo mientras lo editabas.')).toBeVisible()
  expect((await campoDeLead(CLAVE_DEL_CAMPO)).etiqueta).toBe('E2E Signo del zodiaco')
  await segunda.context().close()
})
