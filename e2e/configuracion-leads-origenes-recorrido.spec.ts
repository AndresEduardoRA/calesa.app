import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, abrirConN, dialogo, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import {
  PREFIJO_DE_ORIGEN_E2E,
  abrirOrigenes,
  borrarOrigenesDePrueba,
  llenarHasta,
  origenEnLaBase,
  origenesEnLaBase,
  sembrarOrigen,
  type OrigenEnLaBase,
} from './soporte/origenes-de-lead'
import {
  capturar,
  crearAsesoraDeLaSemilla,
  recibeElClic,
  sinScrollHorizontal,
  tactil,
  volcarArbol,
} from './soporte/recorrido'

// El recorrido de la IA de los orígenes del lead (9f-1) con la dueña y una asesora del rol `asesor`, en
// escritorio y celular: con 0, 12 y 100 orígenes (A a C), el alta con el origen que se apagó y la
// importación sin orígenes activos (D, E). Lo que se juzga mirando, en `E2E_CAPTURAS=e2e-capturas/9f-1`.
test.describe.configure({ mode: 'serial' })

let duena = ''
let asesora = ''
let proyecto = ''
// Los orígenes de la semilla tal como estaban: el caso «cero» los saca y los repone con los mismos ids.
let respaldo: OrigenEnLaBase[] = []

async function reponer() {
  const hay = new Set((await origenesEnLaBase()).map((origen) => origen.id))
  const faltan = respaldo.filter((origen) => !hay.has(origen.id))
  if (faltan.length > 0) {
    await admin()
      .from('origenes_lead')
      .insert(
        faltan.map(({ id, clave, nombre, activo, orden }) => ({
          id,
          clave,
          nombre,
          activo,
          orden,
        })),
      )
  }
}

// Lo que un caso apagó vuelve a como estaba (los ids del respaldo que estaban activos).
async function reponerActivos() {
  const ids = respaldo.filter((origen) => origen.activo).map((origen) => origen.id)
  if (ids.length > 0) {
    await admin().from('origenes_lead').update({ activo: true }).in('id', ids)
  }
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarOrigenesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  respaldo = await origenesEnLaBase()
  duena = correoDePrueba(`duena-origenes-recorrido-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Recorrido' })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarOrigenesDePrueba()
  await reponer()
  await reponerActivos()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// Otra persona en el mismo navegador: sin las cookies de la anterior, `/ingreso` la mandaría de vuelta a `/`.
async function cambiarA(page: Page, correo: string) {
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
}

async function lasAcciones(page: Page) {
  for (const boton of await page
    .getByRole('button', { name: /^(Subir|Bajar|Editar|Eliminar) / })
    .all()) {
    if (await boton.isEnabled()) {
      // Fuera de la pantalla no hay nada que recibir el clic: se baja hasta el botón.
      await boton.scrollIntoViewIfNeeded()
      await recibeElClic(boton)
      await tactil(page, boton)
    }
  }
}

test('A · con 0 orígenes: la pantalla lo dice, y el alta de la dueña y de la asesora sigue andando', async ({
  page,
}, info) => {
  const { error } = await admin().from('origenes_lead').delete().not('id', 'is', null)
  test.skip(error !== null, `hay leads con origen: no se puede vaciar (${error?.message ?? ''})`)

  await entrar(page, duena)
  await abrirOrigenes(page)
  await expect(page.getByText('Todavía no hay orígenes del lead')).toBeVisible()
  await expect(page.getByText(/Sin ninguno, el alta guarda los leads sin origen/)).toBeVisible()
  await sinScrollHorizontal(page)
  await recibeElClic(page.getByRole('button', { name: 'Nuevo origen' }))
  await capturar(page, info, 'duena-cero')

  // «Nuevo origen» desde el vacío.
  await page.getByRole('button', { name: 'Nuevo origen' }).click()
  const modal = page.getByRole('dialog', { name: 'Nuevo origen' })
  await expect(modal).toBeVisible()
  await capturar(page, info, 'duena-cero-modal')
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()

  // El alta: el campo sale apagado y dice qué pasa.
  await abrirConN(page)
  const origen = dialogo(page).getByLabel('Origen del lead')
  await expect(origen).toBeDisabled()
  await expect(
    dialogo(page).getByText('No hay un origen de lead activo: se guarda sin origen.'),
  ).toBeVisible()
  await capturar(page, info, 'duena-cero-alta')
  await page.keyboard.press('Escape')

  // La asesora: ni la pantalla ni el permiso; su alta funciona igual.
  await cambiarA(page, asesora)
  await page.goto('/configuracion/leads?seccion=origenes')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await capturar(page, info, 'asesora-sin-permiso')
  await abrirConN(page)
  await expect(dialogo(page).getByLabel('Origen del lead')).toBeDisabled()
  await capturar(page, info, 'asesora-cero-alta')
  await page.keyboard.press('Escape')
  await reponer()
})

test('B · con 12 orígenes, uno desactivado y uno con leads: la lista, el alta y el filtro del listado', async ({
  page,
}, info) => {
  await reponer()
  await llenarHasta(12)
  const apagado = (await origenesEnLaBase()).find((o) => o.nombre.startsWith(PREFIJO_DE_ORIGEN_E2E))
  expect(apagado).toBeDefined()
  await admin()
    .from('origenes_lead')
    .update({ activo: false })
    .eq('id', apagado?.id ?? '')
  const conLeads = (await origenesEnLaBase())[0]
  const leadId = await crearLead({
    nombre: `Recorrido ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  await admin()
    .from('leads')
    .update({ origen_lead_id: conLeads?.id ?? '' })
    .eq('id', leadId)

  await entrar(page, duena, { fresco: true })
  await abrirOrigenes(page)
  await expect(page.getByText('12 de 100 orígenes posibles.')).toBeVisible()
  await sinScrollHorizontal(page)
  await lasAcciones(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await capturar(page, info, 'duena-doce')
  await volcarArbol(page.getByRole('region', { name: 'Orígenes del lead' }), info, 'duena-doce')

  // El modal de edición, en el celular también cabe.
  await page.getByRole('button', { name: `Editar ${conLeads?.nombre ?? ''}` }).click()
  await expect(page.getByRole('dialog', { name: 'Editar origen' })).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-doce-editar')
  await page.keyboard.press('Escape')

  // El alta ofrece los 11 activos, no el apagado.
  await abrirConN(page)
  const opciones = dialogo(page).getByLabel('Origen del lead').locator('option')
  await expect(opciones).toHaveCount(11)
  await capturar(page, info, 'duena-doce-alta')
  await page.keyboard.press('Escape')

  // El filtro del listado: ofrece todos (también el apagado, con el lead que lo tenga).
  await page.goto('/leads?panel=filtros')
  await expect(
    page.getByRole('group', { name: 'Origen del lead' }).filter({ visible: true }),
  ).toBeVisible()
  await page
    .getByRole('group', { name: 'Origen del lead' })
    .filter({ visible: true })
    .scrollIntoViewIfNeeded()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-doce-filtro')

  // La asesora ve lo mismo en el alta, sin la pantalla.
  await cambiarA(page, asesora)
  await abrirConN(page)
  await expect(dialogo(page).getByLabel('Origen del lead').locator('option')).toHaveCount(11)
  await capturar(page, info, 'asesora-doce-alta')
})

test('C · con el máximo (100): lo dice, «Nuevo origen» se apaga y la lista sigue entera', async ({
  page,
}, info) => {
  await llenarHasta(100)
  await entrar(page, duena, { fresco: true })
  await abrirOrigenes(page)
  await expect(page.getByText('Llegaste al máximo de 100 orígenes.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo origen' })).toBeDisabled()
  await expect(page.getByText('100 de 100 orígenes posibles.')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Editar / })).toHaveCount(100)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-cien')

  // Al fondo de la lista y en el filtro del listado con cien opciones.
  await page.getByText('100 de 100 orígenes posibles.').scrollIntoViewIfNeeded()
  await capturar(page, info, 'duena-cien-fondo')
  await page.goto('/leads?panel=filtros')
  await expect(
    page.getByRole('group', { name: 'Origen del lead' }).filter({ visible: true }),
  ).toBeVisible()
  const grupo = page.getByRole('group', { name: 'Origen del lead' }).filter({ visible: true })
  await grupo.scrollIntoViewIfNeeded()
  await grupo.getByLabel('Buscar en Origen del lead').fill('relleno 07')
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-cien-filtro')

  const nombres = await origenEnLaBase(`${PREFIJO_DE_ORIGEN_E2E} relleno 001`)
  expect(nombres).toBeDefined()
})

test('D · el alta con el origen que se apagó mientras se escribía: el campo pide elegir otro y lo escrito queda', async ({
  page,
}, info) => {
  await reponer()
  const apagable = await sembrarOrigen(`${PREFIJO_DE_ORIGEN_E2E} apagable ${proyecto}`)
  const nombre = `E2E Recorrido apagado ${proyecto}`
  await entrar(page, duena, { fresco: true })
  await abrirConN(page)
  const panel = dialogo(page)
  await panel.getByLabel('Origen del lead').selectOption(apagable.id)
  await panel.getByLabel('Nombre').fill(nombre)
  await panel.getByLabel('Teléfono').first().fill(telefonoAlAzar())
  await capturar(page, info, 'duena-apagable-antes')

  await admin().from('origenes_lead').update({ activo: false }).eq('id', apagable.id)
  await panel.getByRole('button', { name: 'Guardar lead' }).click()
  await expect(panel.getByText(/desactivado|se desactivó/).first()).toBeVisible()
  const select = panel.getByLabel('Origen del lead')
  await expect(select).toHaveValue('')
  await expect(select.locator('option').first()).toHaveText('Elige un origen')
  await expect(panel.getByLabel('Nombre')).toHaveValue(nombre)
  await expect(panel.getByText('Verificando el teléfono')).toBeHidden()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-apagable-despues')
  await select.selectOption({ index: 1 })
  await panel.getByRole('button', { name: 'Guardar lead' }).click()
  await expect(page.getByText(/Lead creado sin seguimiento/)).toBeVisible()
})

test('E · importar sin orígenes activos: el archivo lo dice y los leads entran sin origen', async ({
  page,
}, info) => {
  await reponer()
  await admin().from('origenes_lead').update({ activo: false }).not('id', 'is', null)
  try {
    await entrar(page, duena, { fresco: true })
    await page.goto('/leads/importar')
    await page.locator('input[type=file]').setInputFiles({
      name: 'sin-origenes.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        `\uFEFFNombre;Teléfono\r\nE2E Recorrido sin origen ${proyecto};${telefonoAlAzar()}\r\n`,
        'utf8',
      ),
    })
    await expect(
      page.getByText('No hay un origen de lead activo: los leads se importan sin origen.'),
    ).toBeVisible()
    await expect(page.getByLabel('Origen para las filas sin origen')).toHaveCount(0)
    await sinScrollHorizontal(page)
    await capturar(page, info, 'duena-importar-sin-origenes')
  } finally {
    await reponerActivos()
  }
})
