// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import {
  PREFIJO_DE_REGLAS_E2E,
  borrarNavierasDePrueba,
  ofertaEnLaBase,
  quitarAduanaDeLasFases,
  reglaEnLaBase,
  sembrarFaseDeAduana,
  sembrarNaviera,
} from './soporte/reglas-de-flujo'

// Configuración › Flujos › Reglas (5.11, `docs/UX.md` › «Flujos: reglas y oferta de transporte (estados propios)»): apagar «Aduana» con una fase que la
// permite no apaga y nombra la fase; tras quitarla de la fase, apaga y «Deshacer» la vuelve; la oferta guarda dos puertos y, con una naviera sembrada por
// SQL, la naviera. Corre sobre su propio origen de subasta (su flujo nace con «Aduana» encendida): no toca el flujo de la semilla. Un solo recorrido del
// camino feliz: la base ya tiene sus pruebas de cada regla.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let origenId = ''
let faseId = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarNavierasDePrueba()
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-reglas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Reglas' })
  const origen = await crearOrigenDePrueba(
    `${PREFIJO_DE_REGLAS_E2E} Reglas ${proyecto}`,
    `reglas_5_11_${proyecto}`,
    { tipo: 'subasta', plataformas: ['copart'] },
  )
  origenId = origen.id
  faseId = sembrarFaseDeAduana(origenId, `${PREFIJO_DE_REGLAS_E2E} En aduana`)
})

test.afterAll(async () => {
  borrarNavierasDePrueba()
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
})

test('la dueña apaga una regla sin uso con «Deshacer» y guarda la oferta de transporte', async ({
  page,
}) => {
  const fase = `${PREFIJO_DE_REGLAS_E2E} En aduana`
  const naviera = `${PREFIJO_DE_REGLAS_E2E} Naviera ${proyecto}`
  const url = `/configuracion/flujos?seccion=reglas&origen=${origenId}`
  const aduana = () => page.getByRole('switch', { name: 'Aduana', exact: true })
  const toast = (texto: string) => page.locator('[data-sonner-toast]').filter({ hasText: texto })
  expect(reglaEnLaBase(origenId, 'aduana')).toBe(true)

  // La pestaña está y «Aduana» nace encendida.
  await entrar(page, duena, { fresco: true })
  await page.goto(url)
  await expect(page.getByRole('tab', { name: 'Reglas', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('heading', { name: 'Reglas del flujo', level: 2 })).toBeVisible()
  await expect(aduana()).toBeChecked()

  // Con una fase que la permite no apaga: lo dice y nombra la fase, con su enlace al inspector.
  await aduana().click()
  const aviso = page.getByRole('status').filter({ hasText: 'No se puede apagar «Aduana»' })
  await expect(aviso).toContainText(`la usa la fase «${fase}»`)
  await expect(aviso.getByRole('link', { name: fase })).toHaveAttribute(
    'href',
    `/configuracion/flujos?seccion=fases&origen=${origenId}&fase=${faseId}`,
  )
  await expect(aduana()).toBeChecked()
  expect(reglaEnLaBase(origenId, 'aduana')).toBe(true)

  // Tras quitarla de la fase, apaga al momento y «Deshacer» la vuelve.
  quitarAduanaDeLasFases(origenId)
  await page.goto(url)
  await expect(aduana()).toBeChecked()
  await aduana().click()
  await expect(toast('Regla «Aduana» apagada.')).toBeVisible()
  await expect(aduana()).not.toBeChecked()
  expect(reglaEnLaBase(origenId, 'aduana')).toBe(false)
  await toast('Regla «Aduana» apagada.').getByRole('button', { name: 'Deshacer' }).click()
  await expect(aduana()).toBeChecked()
  expect(reglaEnLaBase(origenId, 'aduana')).toBe(true)

  // La oferta de transporte: vacía se ofrecen todos; las navieras aún no se cargaron (se cargan en Logística).
  await page.goto(url)
  await expect(page.getByRole('heading', { name: 'Oferta de transporte', level: 2 })).toBeVisible()
  const origen = page.getByRole('group', { name: 'Puertos de origen' })
  const destino = page.getByRole('group', { name: 'Puertos de destino' })
  const navieras = page.getByRole('group', { name: 'Navieras' })
  await expect(origen).toContainText('Vacío: se ofrecen todos.')
  await expect(destino).toContainText('Vacío: se ofrecen todos.')
  await expect(navieras).toContainText('Todavía no hay navieras cargadas. Se cargan en Logística.')
  const guardar = page.getByRole('button', { name: 'Guardar oferta' })
  await expect(guardar).toBeDisabled()

  // Dos puertos, uno de origen y uno de destino.
  await origen.getByRole('checkbox', { name: 'Iquique', exact: true }).click()
  await destino.getByRole('checkbox', { name: 'Houston', exact: true }).click()
  await expect(guardar).toBeEnabled()
  await guardar.click()
  await expect(toast('Oferta de transporte guardada.')).toBeVisible()
  expect(ofertaEnLaBase(origenId)).toEqual(['puerto_destino:Houston', 'puerto_origen:Iquique'])
  await page.goto(url)
  await expect(origen.getByRole('checkbox', { name: 'Iquique', exact: true })).toBeChecked()
  await expect(destino.getByRole('checkbox', { name: 'Houston', exact: true })).toBeChecked()

  // Con una naviera sembrada por SQL, aparece, se marca y se guarda con lo anterior.
  sembrarNaviera(naviera)
  await page.goto(url)
  await expect(navieras).not.toContainText('Todavía no hay navieras cargadas')
  await navieras.getByRole('checkbox', { name: naviera, exact: true }).click()
  await guardar.click()
  await expect(toast('Oferta de transporte guardada.')).toBeVisible()
  expect(ofertaEnLaBase(origenId)).toEqual([
    `naviera:${naviera}`,
    'puerto_destino:Houston',
    'puerto_origen:Iquique',
  ])
})
