import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { cotizarEncimaComo, encimaDe, hijasDe } from './soporte/cotizar-encima'
import { publicarLaVersionSiguiente } from './soporte/cotizar-formula'
import {
  envejecerLaCotizacion,
  guardarPorLaHoja,
  numeroDeLaCotizacion,
} from './soporte/cotizar-guardada'
import { limpiarGuardado, prepararGuardado, tipearEnLaHoja } from './soporte/cotizar-guardar'

// «Cotizar encima» (paso 4.15-3b, `docs/UX.md` › «Cotizar»): una guardada que usa otra versión de la fórmula que la de hoy, o que ya venció, lo dice y ofrece crear la versión nueva
// en el acto (la N+1, una viva por anterior). El botón lo decide la base (`puede_cotizar_encima`); con cambios sin guardar espera, porque la versión nueva lleva lo guardado.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let vera = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'encima'))
  vera = correoDePrueba(`vera-encima-${proyecto}`)
  await crearPersona({
    email: vera,
    contrasena: CONTRASENA,
    nombre: 'Vera Solover',
    invitada: true,
  })
  await darRolDePrueba({
    email: vera,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sólo ver encima`, clave: 'e2e_solo_ver_encima' },
    permisos: ['cotizaciones.ver'],
  })
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const AVISO = '[data-aviso-de-version]'
const botonEncima = (page: Page) => page.getByRole('button', { name: /^Cotiz(ar encima|ando)/ })
const VENCIDA = 'Esta cotización está vencida.'
const CON_CAMBIOS =
  'Guarda o descarta tus cambios antes de cotizar encima: la versión nueva lleva lo guardado.'

// Una cotización guardada por la hoja con la fórmula publicada de hoy; vencida, si se la envejece.
async function guardarUna(page: Page, vencida = false): Promise<string> {
  const id = await guardarPorLaHoja(page, { origenId: origen.id, lead, pub: '100' })
  if (vencida) {
    envejecerLaCotizacion(id, 400)
  }
  return id
}

let primera = ''

test('E2E en la misma versión y vigente no hay aviso ni botón', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  primera = await guardarUna(page)
  await page.goto(`/cotizaciones/${primera}`)
  await expect(page.getByRole('heading', { name: /^Cotización n\.º/ })).toBeVisible()
  await expect(page.locator(AVISO)).toHaveCount(0)
  await expect(botonEncima(page)).toHaveCount(0)
})

test('E2E una vencida de la misma versión ofrece «Cotizar encima»', async ({ page }) => {
  envejecerLaCotizacion(primera, 400)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${primera}`)
  await expect(page.locator(AVISO)).toContainText(VENCIDA)
  await expect(page.locator(AVISO)).not.toContainText('usa la versión')
  await expect(botonEncima(page)).toBeVisible()
})

test('E2E quien sólo ve y no cotiza en el origen lee el aviso sin el botón', async ({ page }) => {
  await entrar(page, vera, { fresco: true })
  await page.goto(`/cotizaciones/${primera}`)
  await expect(page.locator(AVISO)).toContainText(VENCIDA)
  await expect(botonEncima(page)).toHaveCount(0)
})

test('E2E con otra versión publicada: «Cotizar encima» crea la versión 2 y la anterior enlaza la nueva', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const anterior = await guardarUna(page)
  publicarLaVersionSiguiente(origen.id, 500)
  await page.goto(`/cotizaciones/${anterior}`)
  await expect(page.locator(AVISO)).toContainText(
    'Esta cotización usa la versión 1; la de hoy es la 2.',
  )
  await botonEncima(page).click()
  await expect(page).toHaveURL(/\/cotizaciones\/[0-9a-f-]{36}$/)
  const nueva = encimaDe(anterior)
  expect(nueva).not.toBe('')
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/${nueva}$`))
  const numero = numeroDeLaCotizacion(nueva)
  await expect(page.getByText(`Versión 2 creada (n.º ${numero}).`)).toBeVisible()
  const enlace = page.getByRole('link', {
    name: `Versión 2 de la n.º ${numeroDeLaCotizacion(anterior)}`,
  })
  await expect(enlace).toHaveAttribute('href', `/cotizaciones/${anterior}`)
  // La anterior dice que tiene una nueva y ya no ofrece el botón.
  await enlace.click()
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/${anterior}$`))
  await expect(
    page.getByText(`Hay una versión nueva: n.º ${numero} (versión 2).`, { exact: false }),
  ).toBeVisible()
  await expect(botonEncima(page)).toHaveCount(0)
})

test('E2E si otra persona cotizó encima mientras tanto, tocar dice que ya tiene una nueva y la abre', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const anterior = await guardarUna(page, true)
  await page.goto(`/cotizaciones/${anterior}`)
  await expect(botonEncima(page)).toBeVisible()
  const nueva = await cotizarEncimaComo({ email: duena, contrasena: CONTRASENA }, anterior)
  await botonEncima(page).click()
  await expect(page.getByText('Esta cotización ya tiene una versión nueva.')).toBeVisible()
  await page.getByRole('link', { name: 'Abrir la versión nueva' }).click()
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/${nueva}$`))
})

test('E2E dos toques seguidos crean una sola versión nueva', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  const anterior = await guardarUna(page, true)
  await page.goto(`/cotizaciones/${anterior}`)
  await botonEncima(page).dblclick()
  await expect(page).toHaveURL(/\/cotizaciones\/[0-9a-f-]{36}$/)
  await expect(page).not.toHaveURL(new RegExp(`/cotizaciones/${anterior}$`))
  expect(hijasDe(anterior)).toBe(1)
})

test('E2E con lo tipeado y sin guardar el botón espera; tras «Guardar» se enciende', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const anterior = await guardarUna(page, true)
  await page.goto(`/cotizaciones/${anterior}`)
  await expect(botonEncima(page)).not.toHaveAttribute('aria-disabled', 'true')
  await tipearEnLaHoja(page, 'pub', '50')
  await expect(botonEncima(page)).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByText(CON_CAMBIOS)).toBeVisible()
  // Playwright espera a que un botón `aria-disabled` se encienda: el toque va forzado para probar que no manda nada.
  await botonEncima(page).click({ force: true })
  expect(hijasDe(anterior)).toBe(0)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados.')).toBeVisible()
  await expect(botonEncima(page)).not.toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByText(CON_CAMBIOS)).toHaveCount(0)
})
