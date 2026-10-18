import { expect, test } from './soporte/prueba'
import { abrirConN, dialogo, entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { borrarLeadsDePrueba, exigir } from './soporte/leads'
import { leadsConTelefono, telefonoAlAzar } from './soporte/leads-alta'
import { abrirEdicion, irAFicha, nuevoLead, versionDe } from './soporte/leads-ficha'
import {
  delLead,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { panelDeFiltros } from './soporte/inventario'
import {
  PREFIJO_DE_TIPO_E2E,
  borrarTiposDePrueba,
  sembrarTipo,
  tipoDeFabrica,
  type TipoEnLaBase,
} from './soporte/tipos-de-lead'

// Los tipos de lead de la base en cada pantalla (9j): el alta los ofrece y propone el de la clase prospecto, la ficha conserva uno
// apagado, el listado lo nombra y lo filtra por su clave, y un tipo que se apaga mientras se escribe no se guarda.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let mayorista: TipoEnLaBase

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  mayorista = await sembrarTipo(`${PREFIJO_DE_TIPO_E2E} Mayorista ${info.project.name}`, 'cliente')
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarTiposDePrueba()
  await limpiarListado(t)
})

async function encender(id: string, activo: boolean): Promise<void> {
  const { error } = await admin().from('tipos_lead').update({ activo }).eq('id', id)
  exigir(error, 'cambiar el estado del tipo')
}

test('el alta ofrece los tipos activos, propone el de la clase prospecto y guarda el elegido', async ({
  page,
}, info) => {
  const apagado = await sembrarTipo(
    `${PREFIJO_DE_TIPO_E2E} Apagado alta ${info.project.name}`,
    'cliente',
    false,
  )
  const numero = telefonoAlAzar()
  await entrar(page, t.personas.duena)
  await irALeads(page)
  await abrirConN(page)
  const panel = dialogo(page)
  const tipo = panel.getByLabel('Tipo')

  const prospecto = await tipoDeFabrica('prospecto')
  await expect(tipo).toHaveValue(prospecto.id)
  const opciones = await tipo.locator('option').allTextContents()
  expect(opciones).toContain(mayorista.nombre)
  expect(opciones).not.toContain(apagado.nombre)

  await panel.getByLabel('Teléfono principal').fill(numero)
  await panel.getByLabel('Nombre').fill(`E2E Tipo alta ${info.project.name}`)
  await tipo.selectOption({ label: mayorista.nombre })
  await panel.getByRole('button', { name: 'Guardar lead' }).click()
  await expect(page.getByText(/Lead creado/)).toBeVisible()

  const [lead] = await leadsConTelefono(`${t.codigo}${numero}`)
  expect(lead?.tipo_lead_id).toBe(mayorista.id)
})

test('un tipo que se apaga mientras se escribe no se guarda: lo dice y deja lo demás', async ({
  page,
}, info) => {
  const efimero = await sembrarTipo(
    `${PREFIJO_DE_TIPO_E2E} Efímero ${info.project.name}`,
    'cliente',
  )
  const numero = telefonoAlAzar()
  const nombre = `E2E Tipo apagado ${info.project.name}`
  await entrar(page, t.personas.duena)
  await irALeads(page)
  await abrirConN(page)
  const panel = dialogo(page)
  await panel.getByLabel('Teléfono principal').fill(numero)
  await panel.getByLabel('Nombre').fill(nombre)
  await panel.getByLabel('Tipo').selectOption({ label: efimero.nombre })

  await encender(efimero.id, false)
  await panel.getByRole('button', { name: 'Guardar lead' }).click()

  await expect(panel.getByText('Ese tipo de lead se desactivó: elige otro.')).toBeVisible()
  await expect(panel.getByLabel('Nombre')).toHaveValue(nombre)
  await expect(panel.getByLabel('Teléfono principal')).toHaveValue(numero)
  expect(await leadsConTelefono(`${t.codigo}${numero}`)).toEqual([])
  // Ya no se ofrece; se vuelve a elegir y entra.
  await expect(panel.getByLabel('Tipo').locator('option', { hasText: efimero.nombre })).toHaveCount(
    0,
  )
  await panel.getByLabel('Tipo').selectOption({ label: mayorista.nombre })
  await panel.getByRole('button', { name: 'Guardar lead' }).click()
  await expect(page.getByText(/Lead creado/)).toBeVisible()
  const [lead] = await leadsConTelefono(`${t.codigo}${numero}`)
  expect(lead?.tipo_lead_id).toBe(mayorista.id)
})

test('el listado nombra el tipo de cada lead y lo filtra por su clave', async ({ page }, info) => {
  const prospecto = await tipoDeFabrica('prospecto')
  await nuevoLead({
    corto: `Fila prospecto ${info.project.name}`,
    telefono: `${t.codigo}${telefonoAlAzar()}`,
    deQuien: t.personas.duena,
    tipoLeadId: prospecto.id,
  })
  await nuevoLead({
    corto: `Fila mayorista ${info.project.name}`,
    telefono: `${t.codigo}${telefonoAlAzar()}`,
    deQuien: t.personas.duena,
    tipoLeadId: mayorista.id,
  })
  await entrar(page, t.personas.duena)
  await irALeads(page, `?tipo=${mayorista.clave}`)
  await expect(delLead(page, `Fila mayorista ${info.project.name}`)).toContainText(mayorista.nombre)
  await expect(delLead(page, `Fila prospecto ${info.project.name}`)).toHaveCount(0)
  await expect(page).toHaveURL(new RegExp(`tipo=${mayorista.clave}`))

  const panelDeTipos = await panelDeFiltros(page)
  await expect(panelDeTipos.getByRole('checkbox', { name: mayorista.nombre })).toBeChecked()
  await expect(panelDeTipos.getByRole('checkbox', { name: 'Prospecto' })).not.toBeChecked()
})

test('la ficha conserva un tipo apagado («(inactivo)») y deja cambiarlo a uno activo', async ({
  page,
}, info) => {
  const lead = await nuevoLead({
    corto: `Ficha tipo ${info.project.name}`,
    telefono: `${t.codigo}${telefonoAlAzar()}`,
    deQuien: t.personas.duena,
    tipoLeadId: mayorista.id,
  })
  await encender(mayorista.id, false)
  try {
    await entrar(page, t.personas.duena)
    await irAFicha(page, lead.id)
    await expect(page.getByText(`${mayorista.nombre} (inactivo)`).first()).toBeVisible()

    const panel = await abrirEdicion(page)
    const tipo = panel.getByLabel('Tipo')
    await expect(tipo.locator('option:checked')).toHaveText(`${mayorista.nombre} (inactivo)`)
    const prospecto = await tipoDeFabrica('prospecto')
    await tipo.selectOption({ label: prospecto.nombre })
    const antes = await versionDe(lead.id)
    await panel.getByRole('button', { name: 'Guardar' }).click()
    await expect(panel).toBeHidden()
    await expect.poll(() => versionDe(lead.id)).not.toBe(antes)
    const { data, error } = await admin()
      .from('leads')
      .select('tipo_lead_id')
      .eq('id', lead.id)
      .single<{ tipo_lead_id: string }>()
    exigir(error, 'leer el tipo del lead')
    expect(data?.tipo_lead_id).toBe(prospecto.id)
  } finally {
    await encender(mayorista.id, true)
  }
})
