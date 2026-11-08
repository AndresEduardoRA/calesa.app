import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  guardarSerie,
  limpiarSeriesDePrueba,
  restaurarSerie,
  serieVigente,
  type SerieGuardada,
} from './soporte/cotizaciones-comprobantes'
import { expect, test } from './soporte/prueba'

// @sin-celular-archivo: Configuración › Empresa no se prueba en celular; pruebas sólo en lo clave (la persona, 2026-11-08)

// La pestaña «Comprobantes» de Configuración › Empresa (paso 4.26-3, `docs/UX.md` › «Empresa»): con `empresa.ajustes.gestionar` se ve la serie vigente y el
// próximo comprobante, y se cambia la serie con su versión. Quién ve la pestaña lo prueba `configuracion/empresa/comprobantes/pestanas.test.ts`; el formato, la
// versión y los permisos de la RPC, `supabase/tests/areas/comprobantes/serie.sql`. La serie vigente es una fila única: se guarda y se devuelve.
test.describe.configure({ mode: 'serial' })

const SERIE = 'E2E-SERIE'

let duena = ''
let antes: SerieGuardada

test.beforeAll(async ({}, info) => {
  // Lo de una corrida que cayó a la mitad, antes que nada: la serie nombra a quien la cambió y esa persona se borra.
  limpiarSeriesDePrueba([SERIE])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  antes = guardarSerie()
  duena = correoDePrueba(`duena-comprobantes-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Comprobantes' })
})

test.afterAll(async () => {
  restaurarSerie(antes, [SERIE])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E1 la dueña cambia la serie: el aviso y «Próximo comprobante» dicen el número nuevo', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/empresa?seccion=comprobantes')
  await expect(page.getByRole('tab', { name: 'Comprobantes', selected: true })).toBeVisible()
  await expect(page.locator('[data-serie-vigente]')).toHaveText(antes.serie)

  await page.getByLabel('Serie', { exact: true }).fill('e2e-serie')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(
    page.getByText(`La serie vigente es ${SERIE}: el próximo comprobante es ${SERIE}-1.`),
  ).toBeVisible()
  await expect(page.locator('[data-serie-vigente]')).toHaveText(SERIE)
  await expect(page.locator('[data-proximo-comprobante]')).toHaveText(`${SERIE}-1`)
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  expect(serieVigente()).toBe(SERIE)
})
