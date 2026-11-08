// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { sql } from './soporte/sql'

// La pestaña «Ajustes» de Configuración › Cotización (4.20-4b, `docs/UX.md` › «Cotización: ajustes (estados propios)»): la vigencia y el vehículo obligatorio al
// cotizar. La ve quien tiene `cotizaciones.configurar` en algún origen y la cambia quien la tiene en todos. El conflicto de versión lo prueba la T3 de
// `supabase/tests/empresa-ajustes-de-cotizacion.sql`. La fila es única: se restaura al final (el e2e corre con un solo worker).
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let configuradora = ''
let antes = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  antes = sql(
    "select vigencia_dias || ',' || vehiculo_obligatorio_al_cotizar from public.ajustes_empresa",
  )
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-ajustes-cot-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Vera Vigencia' })
  configuradora = correoDePrueba(`configura-ajustes-cot-${proyecto}`)
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Uma Unorigen',
    invitada: true,
  })
  const origenId = sql('select id from public.origenes order by clave limit 1')
  await darRolDePrueba({
    email: configuradora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Configura un origen ${proyecto}`,
      clave: `e2e_configura_uno_${proyecto}`,
    },
    permisos: [{ clave: 'cotizaciones.configurar', origenId }],
  })
})

test.afterAll(async () => {
  const [vigencia, obligatorio] = antes.split(',')
  if (vigencia && obligatorio) {
    sql(
      `update public.ajustes_empresa set vigencia_dias = ${Number(vigencia)}, vehiculo_obligatorio_al_cotizar = ${obligatorio === 'true'}`,
    )
  }
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const vigencia = (page: Page) => page.getByLabel('Vigencia (días)')
const vehiculoObligatorio = (page: Page) =>
  page.getByRole('switch', { name: 'Vehículo obligatorio al cotizar' })

test('la dueña cambia la vigencia y el vehículo obligatorio desde el hub, y quedan guardados', async ({
  page,
}) => {
  sql(
    'update public.ajustes_empresa set vigencia_dias = 15, vehiculo_obligatorio_al_cotizar = true',
  )
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion')
  await page.getByRole('link', { name: /Cotización/ }).click()
  await page.getByRole('tab', { name: 'Ajustes' }).click()
  await expect(page).toHaveURL(/seccion=ajustes/)
  await expect(page.getByRole('tab', { name: 'Ajustes' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Ajustes', level: 2 })).toBeVisible()
  await expect(vigencia(page)).toHaveValue('15')
  await expect(vehiculoObligatorio(page)).toBeChecked()

  await vigencia(page).fill('30')
  await vehiculoObligatorio(page).click()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Ajustes de cotización guardados')).toBeVisible()
  expect(
    sql(
      "select vigencia_dias || ',' || vehiculo_obligatorio_al_cotizar from public.ajustes_empresa",
    ),
  ).toBe('30,false')

  await page.reload()
  await expect(vigencia(page)).toHaveValue('30')
  await expect(vehiculoObligatorio(page)).not.toBeChecked()
})

test('quien configura un solo origen ve los ajustes apagados, con el motivo y sin «Guardar»', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await page.goto('/configuracion/cotizacion')
  // Entra por la fórmula: «Ajustes» va al final.
  await expect(page.getByRole('tab', { name: 'Fórmula' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: 'Ajustes' }).click()
  await expect(page.getByRole('heading', { name: 'Ajustes', level: 2 })).toBeVisible()
  await expect(
    page.getByText('Cambiar estos ajustes pide configurar el cotizador en todos los orígenes.'),
  ).toBeVisible()
  await expect(vigencia(page)).toBeDisabled()
  await expect(vehiculoObligatorio(page)).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Guardar' })).toHaveCount(0)
})
