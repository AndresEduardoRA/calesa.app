// @sin-celular-archivo: pantalla nueva con un solo camino feliz en escritorio (.claude/rules/e2e.md › «Pruebas: sólo lo clave»); las tarjetas y el menú no cambian con el ancho
import { expect, test } from './soporte/prueba'
import { entrar, limpiarAlta, prepararAlta, type PersonasDelAlta } from './soporte/alta'
import { borrarLeadsDePrueba, crearLead, PREFIJO_DE_LEAD_E2E } from './soporte/leads'
import { codigoDePaisDeLaEmpresa, telefonoAlAzar } from './soporte/leads-alta'
import { abrirEdicion, irAFicha, tituloDeLaFicha } from './soporte/leads-ficha'
import { abrirMenuDeLaFicha } from './soporte/leads-marcas'
import { sql } from './soporte/sql'

// La actividad (9.01) contra la app compilada y el Supabase local: la dueña cambia el nombre de un lead en su ficha, entra por «Ver actividad»
// del «⋯» a la actividad de ese lead, ve el cambio bajo «Hoy», abre su diff y lee el antes y el después; una asesora sin `actividad.ver` no
// tiene «Actividad» en su menú. El recorte, la cartera y los números los prueba `supabase/tests/areas/actividad/`.
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar: () => Promise<void>
let leadId = ''
let antes = ''

test.beforeAll(async ({}, info) => {
  const alta = await prepararAlta(info.project.name)
  personas = alta.personas
  restaurar = alta.restaurarCatalogos
  const corto = `Actividad ${info.project.name}`
  antes = `${PREFIJO_DE_LEAD_E2E}${corto}`
  leadId = await crearLead({
    nombre: corto,
    telefono: `${await codigoDePaisDeLaEmpresa()}${telefonoAlAzar()}`,
    deQuien: personas.duena,
  })
})

test.afterAll(async () => {
  if (leadId !== '') {
    sql(`delete from public.actividad where tabla = 'leads' and registro_id = '${leadId}'`)
  }
  await borrarLeadsDePrueba()
  await limpiarAlta(restaurar)
})

test('la dueña ve el cambio del nombre en la actividad del lead y abre su diff', async ({
  page,
}) => {
  const despues = `${antes} editado`
  await entrar(page, personas.duena)
  await irAFicha(page, leadId)
  await expect(tituloDeLaFicha(page, antes)).toBeVisible()
  const panel = await abrirEdicion(page)
  await panel.getByLabel('Nombre').fill(despues)
  await page.keyboard.press('Control+s')
  await expect(page.getByText('Cambios guardados')).toBeVisible()
  await expect(tituloDeLaFicha(page, despues)).toBeVisible()

  const menu = await abrirMenuDeLaFicha(page)
  await menu.getByRole('menuitem', { name: 'Ver actividad' }).click()
  await expect(page).toHaveURL(new RegExp(`/actividad\\?entidad=leads&registro=${leadId}$`))
  await expect(page.getByText('Mostrando la actividad de un solo registro de lead.')).toBeVisible()
  await expect(page.locator('th', { hasText: /^Hoy$/ })).toBeVisible()

  // El alta la hizo el sistema (el lead se creó con el cliente de servicio); el cambio del nombre, la dueña.
  const fila = page.getByRole('row').filter({ hasText: 'Dalia Alta' })
  await expect(fila).toHaveCount(1)
  await expect(fila).toContainText('Nombre')
  await fila.getByRole('button', { name: /^Abrir Cambió/ }).click()
  await expect(page).toHaveURL(/[?&]cambio=\d+/)
  const diff = page.getByRole('dialog', { name: 'Detalle del cambio' })
  await expect(diff).toBeVisible()
  await expect(diff.getByRole('term')).toHaveText(['Nombre'])
  const valores = diff.getByRole('definition')
  await expect(valores).toContainText(`Antes${antes}`)
  await expect(valores).toContainText(`Después${despues}`)

  await page.keyboard.press('Escape')
  await expect(diff).toBeHidden()
})

test('una asesora sin actividad.ver no tiene «Actividad» en su menú', async ({ page }) => {
  await entrar(page, personas.berta)
  await page.goto('/')
  await page.getByRole('button', { name: `Menú de ${personas.nombres.berta}` }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Actividad' })).toHaveCount(0)
})
