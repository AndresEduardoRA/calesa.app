import { expect, test } from './soporte/prueba'
import {
  CLAVE,
  entrar,
  irAlOrigen,
  limpiarInventario,
  prepararInventario,
} from './soporte/inventario'
import { PREFIJO_ROL_E2E, correoDePrueba, crearPersona, darRolDePrueba } from './soporte/base'

// Quién da de alta y cómo (B1, `docs/TANDA.md`): con sólo la clave de cotizar, «Nuevo» del inventario se ve apagado con su motivo y ofrece
// «Cotizar un vehículo nuevo», que abre la hoja de cotizar con el panel del vehículo en el alta.
let corea = { id: '', nombre: '' }
let cotizadora = ''

test.beforeAll(async ({}, info) => {
  ;({ corea } = await prepararInventario(info.project.name))
  cotizadora = correoDePrueba(`cotizadora-${info.project.name}`)
  await crearPersona({
    email: cotizadora,
    contrasena: CLAVE,
    nombre: 'Celia Cotiza',
    invitada: true,
  })
  await darRolDePrueba({
    email: cotizadora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Cotizadora ${info.project.name}`,
      clave: `e2e_cotizadora_${info.project.name}`,
    },
    permisos: [
      { clave: 'vehiculos.ver', origenId: corea.id },
      { clave: 'vehiculos.crear.desde_cotizar', origenId: corea.id },
      { clave: 'cotizaciones.ver', origenId: corea.id },
      { clave: 'cotizaciones.crear', origenId: corea.id },
    ],
  })
})

test.afterAll(limpiarInventario)

test('E2E sin el alta suelta, «Nuevo» se apaga y lleva a cotizar un vehículo nuevo', async ({
  page,
}) => {
  await entrar(page, cotizadora)
  await irAlOrigen(page, corea)
  await expect(page.getByRole('button', { name: /^Nuev[oa] / })).toBeDisabled()
  await expect(
    page.getByText('Tu rol da de alta vehículos sólo desde la hoja de cotizar'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cotizar un vehículo nuevo' }).click()
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?/)
  const url = new URL(page.url())
  expect(url.searchParams.get('origen')).toBe(corea.id)
  expect(url.searchParams.get('panel')).toBe('vehiculo')
  expect(url.searchParams.get('alta')).toBe('mano')
})
