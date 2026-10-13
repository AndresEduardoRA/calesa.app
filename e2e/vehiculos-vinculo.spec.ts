import { expect, test, type Page } from '@playwright/test'
import { PREFIJO_ROL_E2E, correoDePrueba, crearPersona, darRolDePrueba } from './soporte/base'
import {
  CLAVE,
  aLaVista,
  entrar,
  irAlOrigen,
  limpiarInventario,
  prepararInventario,
  type Terreno,
} from './soporte/inventario'
import { borrarLeadsDePrueba, crearLead, marcarInteres, vincular } from './soporte/leads'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'

// El vínculo a un lead y los interesados, vistos desde la ficha del vehículo (todavía no hay
// pantalla que los escriba: se cargan directo). Y lo que el vínculo otorga: con alcance «propios»,
// quien tiene al lead en su cartera edita el vehículo aunque no lo haya creado.
test.describe.configure({ mode: 'serial' })

const VINCULADO = 'Vínculo Sedán'
const SUELTO = 'Vínculo Camioneta'
const LEAD = 'E2E Marta Flores'

let soloCorea = ''
let asesora = ''
let colega = ''
let corea: Terreno['corea'] = { id: '', nombre: '' }
let vinculado = ''
let suelto = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  const terreno = await prepararInventario(proyecto)
  ;({ soloCorea, corea } = terreno)
  await cargarVehiculos(corea.id, [{ titulo: VINCULADO }, { titulo: SUELTO }])
  vinculado = (await vehiculoPorTitulo(VINCULADO))?.id ?? ''
  suelto = (await vehiculoPorTitulo(SUELTO))?.id ?? ''

  // Ve todo Corea y edita sólo lo propio; lleva su cartera de leads.
  asesora = correoDePrueba(`asesora-vinculo-${proyecto}`)
  await crearPersona({ email: asesora, contrasena: CLAVE, nombre: 'Ada Asesora', invitada: true })
  await darRolDePrueba({
    email: asesora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Asesora ${proyecto}`, clave: `e2e_asesora_${proyecto}` },
    permisos: [
      { clave: 'vehiculos.ver', origenId: corea.id },
      { clave: 'vehiculos.editar', origenId: corea.id, alcance: 'propios' },
      { clave: 'leads.ver', alcance: 'propios' },
      { clave: 'leads.editar', alcance: 'propios' },
    ],
  })
  // Ve los vehículos de Corea y sus propios leads: no tiene ninguno.
  colega = correoDePrueba(`colega-vinculo-${proyecto}`)
  await crearPersona({ email: colega, contrasena: CLAVE, nombre: 'Cora Colega', invitada: true })
  await darRolDePrueba({
    email: colega,
    rol: { nombre: `${PREFIJO_ROL_E2E}Colega ${proyecto}`, clave: `e2e_colega_${proyecto}` },
    permisos: [
      { clave: 'vehiculos.ver', origenId: corea.id },
      { clave: 'leads.ver', alcance: 'propios' },
    ],
  })

  const lead = await crearLead({
    nombre: 'Marta Flores',
    telefono: `5917${String(Date.now()).slice(-7)}`,
    deQuien: asesora,
  })
  await vincular(vinculado, lead)
  await marcarInteres({
    vehiculoId: suelto,
    leadId: lead,
    quien: asesora,
    nota: 'Lo quiere en blanco',
  })
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await limpiarInventario()
})

async function abrirFicha(page: Page, vehiculoId: string, titulo: string) {
  await page.goto(`/vehiculos/${vehiculoId}`)
  await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
}
const vinculo = (page: Page) => page.getByRole('region', { name: 'Vínculo', exact: true })
const interesados = (page: Page) => page.getByRole('region', { name: 'Interesados' })

test('quien tiene al lead en su cartera ve el vínculo y edita el vehículo que no creó', async ({
  page,
}) => {
  await entrar(page, asesora)
  await abrirFicha(page, vinculado, VINCULADO)
  await expect(vinculo(page).getByText(LEAD)).toBeVisible()
  await expect(vinculo(page).getByText(/^Desde el /)).toBeVisible()

  // No lo creó ella, pero es de un lead de su cartera: «Editar» aparece y la base lo acepta.
  await page.getByRole('button', { name: 'Editar' }).click()
  const panel = page.getByRole('dialog', { name: `Editar ${VINCULADO}` })
  await panel.getByLabel('Marca').fill('Hyundai')
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados')).toBeVisible()
  expect((await vehiculoPorTitulo(VINCULADO))?.marca).toBe('Hyundai')

  // Lo mismo con sus fotos.
  await page.goto(`/vehiculos/${vinculado}?seccion=fotos`)
  await expect(page.getByRole('button', { name: 'Elegir fotos' })).toBeVisible()

  // En el inventario, «Editar» sólo en el vinculado.
  await irAlOrigen(page, corea)
  await expect(aLaVista(page.getByRole('button', { name: `Editar ${VINCULADO}` }))).toHaveCount(1)
  await expect(aLaVista(page.getByRole('button', { name: `Editar ${SUELTO}` }))).toHaveCount(0)
})

test('el interés de su lead se ve en el otro vehículo, que no puede editar', async ({ page }) => {
  await entrar(page, asesora)
  await abrirFicha(page, suelto, SUELTO)
  await expect(vinculo(page).getByText(/^Sin vínculo/)).toBeVisible()
  await expect(interesados(page).getByText(LEAD)).toBeVisible()
  await expect(interesados(page).getByText('Lo quiere en blanco')).toBeVisible()
  await expect(interesados(page).getByText(/lo marcó Ada Asesora/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  await page.goto(`/vehiculos/${suelto}?seccion=fotos`)
  // Las fotos llegan por streaming: por un instante el texto está también en el tramo oculto
  // que React todavía no movió a su lugar.
  await expect(aLaVista(page.getByText('Este vehículo no tiene fotos'))).toBeVisible()
  await expect(page.getByRole('button', { name: 'Elegir fotos' })).toHaveCount(0)
})

test('quien no tiene al lead en su cartera sabe que hay un vínculo, no de quién', async ({
  page,
}) => {
  await entrar(page, colega)
  await abrirFicha(page, vinculado, VINCULADO)
  await expect(vinculo(page).getByText('Un lead que no está en tu cartera')).toBeVisible()
  await expect(page.getByText(LEAD)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  // El interés de un lead ajeno no le aparece.
  await abrirFicha(page, suelto, SUELTO)
  await expect(interesados(page).getByText(/Ninguno de los leads que ves/)).toBeVisible()
})

test('sin permiso sobre leads el bloque no existe', async ({ page }) => {
  await entrar(page, soloCorea)
  await abrirFicha(page, vinculado, VINCULADO)
  await expect(page.getByText('Vínculo e interesados')).toHaveCount(0)
  await expect(page.getByText(LEAD)).toHaveCount(0)
})
