import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { descartarAviso } from './soporte/inventario'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { abrirConN, dialogo } from './soporte/alta'
import { telefonoAlAzar } from './soporte/leads-alta'
import { abrirEdicion, irAFicha, leadEnLaBase } from './soporte/leads-ficha'
import {
  PREFIJO_DE_ORIGEN_E2E,
  abrirOrigenes,
  borrarOrigenesDePrueba,
  filaDeOrigen,
  modalDeOrigen,
  nombresEnPantalla,
  origenEnLaBase,
  origenesEnLaBase,
  sembrarOrigen,
} from './soporte/origenes-de-lead'
import { admin } from './soporte/base'

// Configuración › Leads › Orígenes del lead (9f-1) contra la app compilada y el Supabase local: crear,
// renombrar (nombre vacío, repetido y con espacios), ordenar con el teclado, desactivar (el alta no lo
// ofrece, la ficha lo conserva) y eliminar sólo sin leads. Los casos no felices, en
// `configuracion-leads-origenes-casos.spec.ts`. Todo lo que crea lleva «E2E 9f» y se borra al terminar.
test.describe.configure({ mode: 'serial' })

let duena = ''
let proyecto = ''
const nombre = (resto: string) => `${PREFIJO_DE_ORIGEN_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarOrigenesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-origenes-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Orígenes' })
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarOrigenesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function nuevoOrigen(page: Page, texto: string) {
  await page.getByRole('button', { name: 'Nuevo origen' }).first().click()
  const modal = modalDeOrigen(page, 'Nuevo origen')
  await modal.getByLabel('Nombre').fill(texto)
  await modal.getByRole('button', { name: 'Crear origen' }).click()
  return modal
}

test('se crea un origen, y el nombre vacío o repetido se rechaza junto al campo', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirOrigenes(page)
  const uno = nombre('Uno')

  // Con espacios de más: se guarda limpio.
  const modal = await nuevoOrigen(page, `   ${uno.replace(' ', '   ')}  `)
  await expect(modal).toBeHidden()
  await descartarAviso(page, 'Origen creado.')
  expect(await origenEnLaBase(uno)).toMatchObject({ activo: true })
  await expect(filaDeOrigen(page, uno)).toBeVisible()
  // Queda al final de la lista.
  const nombres = await nombresEnPantalla(page)
  expect(nombres.at(-1)).toBe(uno)

  // Vacío.
  await page.getByRole('button', { name: 'Nuevo origen' }).first().click()
  const vacio = modalDeOrigen(page, 'Nuevo origen')
  await vacio.getByRole('button', { name: 'Crear origen' }).click()
  await expect(vacio.getByText('Escribe el nombre del origen.')).toBeVisible()
  await expect(vacio.getByLabel('Nombre')).toHaveAttribute('aria-invalid', 'true')

  // Repetido, sin importar mayúsculas.
  await vacio.getByLabel('Nombre').fill(uno.toUpperCase())
  await vacio.getByRole('button', { name: 'Crear origen' }).click()
  await expect(vacio.getByText(`Ya hay un origen «${uno.toUpperCase()}».`)).toBeVisible()
  expect(
    (await origenesEnLaBase()).filter((o) => o.nombre.toLowerCase() === uno.toLowerCase()),
  ).toHaveLength(1)

  // Cerrar con algo escrito pregunta antes de descartar.
  await vacio.getByLabel('Nombre').fill('Algo sin guardar')
  await vacio.getByRole('button', { name: 'Cancelar' }).click()
  await expect(vacio.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await vacio.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(vacio.getByLabel('Nombre')).toHaveValue('Algo sin guardar')
  await vacio.getByRole('button', { name: 'Cancelar' }).click()
  await vacio.getByRole('button', { name: 'Descartar' }).click()
  await expect(vacio).toBeHidden()
  expect(page.url()).not.toContain('panel=')
})

test('se renombra, y un nombre ya tomado o vacío no pasa', async ({ page }) => {
  const uno = nombre('Uno')
  const dos = nombre('Dos')
  await sembrarOrigen(dos)
  await entrar(page, duena)
  await abrirOrigenes(page)

  await page.getByRole('button', { name: `Editar ${uno}` }).click()
  const modal = modalDeOrigen(page, 'Editar origen')
  await expect(modal.getByLabel('Nombre')).toHaveValue(uno)
  await modal.getByLabel('Nombre').fill(dos)
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal.getByText(`Ya hay un origen «${dos}».`)).toBeVisible()
  await modal.getByLabel('Nombre').fill('   ')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal.getByText('Escribe el nombre del origen.')).toBeVisible()
  await modal.getByLabel('Nombre').fill(nombre('Primero'))
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toBeHidden()
  await descartarAviso(page, 'Origen guardado.')
  expect(await origenEnLaBase(uno)).toBeUndefined()
  expect(await origenEnLaBase(nombre('Primero'))).toMatchObject({ activo: true })
})

test('se ordena con el teclado: sube, baja y el foco se queda en el botón', async ({ page }) => {
  const primero = nombre('Primero')
  const segundo = nombre('Dos')
  const tercero = nombre('Tres')
  await sembrarOrigen(tercero)
  await entrar(page, duena)
  await abrirOrigenes(page)
  const antes = (await nombresEnPantalla(page)).filter((n) => n.startsWith(PREFIJO_DE_ORIGEN_E2E))
  expect(antes).toEqual([primero, segundo, tercero])

  const subir = page.getByRole('button', { name: `Subir ${tercero}` })
  await subir.focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(async () =>
      (await nombresEnPantalla(page)).filter((n) => n.startsWith(PREFIJO_DE_ORIGEN_E2E)),
    )
    .toEqual([primero, tercero, segundo])
  // El foco siguió al botón de esa fila, que ahora está un lugar más arriba.
  await expect(subir).toBeFocused()
  await expect(page.getByRole('status').filter({ hasText: 'quedó en el lugar' })).toContainText(
    tercero,
  )
  const enLaBase = (await origenesEnLaBase()).filter((o) =>
    o.nombre.startsWith(PREFIJO_DE_ORIGEN_E2E),
  )
  expect(enLaBase.map((o) => o.nombre)).toEqual([primero, tercero, segundo])
  expect(new Set((await origenesEnLaBase()).map((o) => o.orden)).size).toBe(
    (await origenesEnLaBase()).length,
  )

  // Bajarlo de nuevo, otra vez con el teclado.
  const bajar = page.getByRole('button', { name: `Bajar ${tercero}` })
  await bajar.focus()
  await page.keyboard.press('Space')
  await expect
    .poll(async () =>
      (await nombresEnPantalla(page)).filter((n) => n.startsWith(PREFIJO_DE_ORIGEN_E2E)),
    )
    .toEqual([primero, segundo, tercero])
  // Quedó último de todos: «Bajar» se apagó y el foco pasó a «Subir», que sigue a mano.
  await expect(bajar).toBeDisabled()
  await expect(subir).toBeFocused()
})

test('desactivar: el alta no lo ofrece, la ficha lo conserva y se puede editar; «Deshacer» lo vuelve', async ({
  page,
}) => {
  const uno = nombre('Primero')
  const origen = await origenEnLaBase(uno)
  const leadId = await crearLead({
    nombre: `Lead de ${uno}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  await admin()
    .from('leads')
    .update({ origen_lead_id: origen?.id ?? '' })
    .eq('id', leadId)

  await entrar(page, duena)
  await abrirOrigenes(page)
  const fila = filaDeOrigen(page, uno)
  await expect(fila.getByText('Tiene leads', { exact: true })).toBeVisible()
  await fila.getByRole('switch', { name: `${uno}: activo` }).click()
  await expect(fila.getByText('Desactivado')).toBeVisible()
  await expect(fila.getByText('Tiene leads · no se ofrece en un lead nuevo')).toBeVisible()
  expect(await origenEnLaBase(uno)).toMatchObject({ activo: false })

  // El alta no lo ofrece; los demás activos, sí.
  await abrirConN(page)
  const opciones = dialogo(page).getByLabel('Origen del lead').locator('option')
  await expect(opciones.first()).toBeAttached()
  expect(await opciones.allTextContents()).not.toContain(uno)
  await page.keyboard.press('Escape')

  // La ficha del lead que lo tiene lo nombra «(inactivo)» y se edita sin obligar a cambiarlo.
  await irAFicha(page, leadId)
  await expect(page.getByText(`${uno} (inactivo)`).first()).toBeVisible()
  const panel = await abrirEdicion(page)
  await expect(panel.getByLabel('Origen del lead')).toHaveValue(origen?.id ?? '')
  const ofrecidos = await panel.getByLabel('Origen del lead').locator('option').allTextContents()
  expect(ofrecidos.filter((texto) => texto.includes('(inactivo)'))).toEqual([`${uno} (inactivo)`])
  await panel.getByLabel('Nombre').fill(`E2E Lead editado ${proyecto}`)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados')).toBeVisible()
  expect((await leadEnLaBase(leadId)).origen_lead_id).toBe(origen?.id)

  // El filtro del listado lo sigue ofreciendo, al final y marcado: hay leads que lo tienen.
  await page.goto('/leads?panel=filtros')
  const opcionesDelFiltro = page
    .getByRole('group', { name: 'Origen del lead' })
    .filter({ visible: true })
    .locator('label')
  await expect(opcionesDelFiltro.last()).toContainText(`${uno} (inactivo)`)

  // «Deshacer» lo activa otra vez.
  await abrirOrigenes(page)
  await filaDeOrigen(page, uno)
    .getByRole('switch', { name: `${uno}: activo` })
    .click()
  await expect(filaDeOrigen(page, uno).getByText('Desactivado')).toHaveCount(0)
  expect(await origenEnLaBase(uno)).toMatchObject({ activo: true })
})

test('eliminar: con leads está apagado y lo dice; sin leads pide confirmar nombrándolo', async ({
  page,
}) => {
  const uno = nombre('Primero')
  const dos = nombre('Dos')
  await entrar(page, duena)
  await abrirOrigenes(page)

  const conLeads = page.getByRole('button', { name: `Eliminar ${uno}` })
  await expect(conLeads).toBeDisabled()
  await expect(conLeads).toHaveAttribute('title', new RegExp(`«${uno}» ya tiene leads`))

  await page.getByRole('button', { name: `Eliminar ${dos}` }).click()
  const confirmar = page.getByRole('dialog', { name: `Eliminar el origen «${dos}»` })
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole('button', { name: 'Cancelar' }).click()
  expect(await origenEnLaBase(dos)).toBeDefined()

  await page.getByRole('button', { name: `Eliminar ${dos}` }).click()
  await page
    .getByRole('dialog', { name: `Eliminar el origen «${dos}»` })
    .getByRole('button', { name: 'Eliminar origen' })
    .click()
  await descartarAviso(page, `«${dos}» eliminado.`)
  await expect(filaDeOrigen(page, dos)).toHaveCount(0)
  expect(await origenEnLaBase(dos)).toBeUndefined()
})
