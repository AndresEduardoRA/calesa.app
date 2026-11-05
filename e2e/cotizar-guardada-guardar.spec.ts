import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { idDePersona } from './soporte/cotizaciones-sembradas'
import {
  guardarComo,
  loGuardadoDe,
  nodosDeLaUltimaRevision,
  revisionesDe,
  urlDeLaHoja,
  vigilarGuardadosDeUnaGuardada,
} from './soporte/cotizar-guardada'
import {
  celdaDeLaHoja,
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'

// «Guardar» una cotización guardada (paso 4.15-3, `docs/UX.md` › «Cotizar»): la hoja de `/cotizaciones/[id]` guarda los cambios con SU versión de la fórmula y la versión que vio quien
// edita. Lo que decide la base, la base lo dice; lo que la hoja no cambia, la hoja no lo toca.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let olga = ''
let vera = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'gg'))
  olga = correoDePrueba(`olga-guardada-${proyecto}`)
  await crearPersona({ email: olga, contrasena: CONTRASENA, nombre: 'Olga Otra', invitada: true })
  await darRolDePrueba({
    email: olga,
    rol: { nombre: `${PREFIJO_ROL_E2E}Edita guardadas`, clave: 'e2e_edita_guardadas' },
    permisos: ['cotizaciones.ver', 'cotizaciones.editar'],
  })
  vera = correoDePrueba(`vera-guardar-${proyecto}`)
  await crearPersona({
    email: vera,
    contrasena: CONTRASENA,
    nombre: 'Vera Solover',
    invitada: true,
  })
  await darRolDePrueba({
    email: vera,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sólo ver al guardar`, clave: 'e2e_solo_ver_al_guardar' },
    permisos: ['cotizaciones.ver'],
  })
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const botonGuardar = (page: Page) => page.getByRole('button', { name: 'Guardar', exact: true })
const SIN_CAMBIOS = 'Sin cambios que guardar.'
const CAMBIOS_GUARDADOS = 'Cambios guardados.'

// Una cotización con un input (`pub`), un override (`con_ayuda`) y una bandera (`activar`), guardada por la hoja nueva.
async function guardarConDeTodo(page: Page): Promise<string> {
  const guardados = await vigilarGuardados(page)
  await page.goto(urlDeLaHoja(origen.id, lead))
  await tipearEnLaHoja(page, 'pub', '100')
  await tipearEnLaHoja(page, 'con_ayuda', '7')
  await celdaDeLaHoja(page, 'activar').getByRole('switch', { name: 'Activar' }).click()
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  const id = guardados.pedidos[0]?.intento
  if (id === undefined) {
    throw new Error('No se vio el guardado.')
  }
  return id
}

let cotizacion = ''

test('E2E guardar un cambio no toca lo demás: el override y la bandera quedan como estaban', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  cotizacion = await guardarConDeTodo(page)
  expect(loGuardadoDe(cotizacion, 'con_ayuda')).toEqual({ valor: '7', fuente: 'override' })
  const antes = revisionesDe(cotizacion)
  await page.goto(`/cotizaciones/${cotizacion}`)
  await expect(celdaDeLaHoja(page, 'con_ayuda')).toContainText('7,00')
  await tipearEnLaHoja(page, 'pub', '200')
  await botonGuardar(page).click()
  await expect(page.getByText(CAMBIOS_GUARDADOS)).toBeVisible()
  expect(revisionesDe(cotizacion)).toBe(antes + 1)
  // La revisión nombra lo que cambió (el input y lo que depende de él) y no el override ni la bandera.
  const cambiaron = [
    ...nodosDeLaUltimaRevision(cotizacion, 'valores'),
    ...nodosDeLaUltimaRevision(cotizacion, 'fuentes'),
  ]
  expect(cambiaron).toContain('pub')
  expect(cambiaron).not.toContain('con_ayuda')
  expect(cambiaron).not.toContain('activar')
  expect(loGuardadoDe(cotizacion, 'con_ayuda')).toEqual({ valor: '7', fuente: 'override' })
  expect(loGuardadoDe(cotizacion, 'pub').valor).toBe('200')
})

test('E2E sin cambios «Guardar» está apagado y Ctrl/Cmd+S no manda nada', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  const guardados = await vigilarGuardadosDeUnaGuardada(page, cotizacion)
  await page.goto(`/cotizaciones/${cotizacion}`)
  await expect(botonGuardar(page)).toBeDisabled()
  await expect(page.getByText(SIN_CAMBIOS)).toBeVisible()
  await guardarConElAtajo(page)
  await page.waitForTimeout(600)
  expect(guardados.pedidos).toHaveLength(0)
})

test('E2E guardar dice «Cambios guardados.», la URL no cambia y al recargar está lo guardado', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const guardados = await vigilarGuardadosDeUnaGuardada(page, cotizacion)
  await page.goto(`/cotizaciones/${cotizacion}`)
  await tipearEnLaHoja(page, 'pub', '300')
  await expect(botonGuardar(page)).toBeEnabled()
  await botonGuardar(page).click()
  await expect(page.getByText(CAMBIOS_GUARDADOS)).toBeVisible()
  expect(page.url()).toContain(`/cotizaciones/${cotizacion}`)
  const [pedido] = guardados.pedidos
  expect(pedido?.cotizacionId).toBe(cotizacion)
  // La versión viaja como el texto de la base, con sus microsegundos.
  expect(pedido?.actualizadoEn).toMatch(/T\d\d:\d\d:\d\d\.\d{6}\+00:00$/)
  await page.reload()
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('300')
  await expect(totalDeLaHoja(page)).toContainText('307,00')
  await expect(page.getByText(CAMBIOS_GUARDADOS)).toHaveCount(0)
  await expect(botonGuardar(page)).toBeDisabled()
})

test('E2E si otra persona guardó mientras tanto, el conflicto dice quién y que lo tipeado no vuelve', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${cotizacion}`)
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('300')
  // Olga cambia sólo `pub` (visible y editable para ella): lo oculto y lo que sólo edita el nivel «costos» lo conserva la base.
  await guardarComo({ email: olga, contrasena: CONTRASENA }, { cotizacionId: cotizacion, pub: 77 })
  await tipearEnLaHoja(page, 'pub', '20')
  await botonGuardar(page).click()
  await expect(page.getByText(/Olga Otra cambió esta cotización/)).toBeVisible()
  await expect(
    page.getByText(/Al recargar se abre esa versión; lo que escribiste no vuelve\./),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Recargar' }).click()
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('77')
  await expect(celdaDeLaHoja(page, 'pub')).not.toContainText('20')
  await expect(page.getByText(/Olga Otra cambió esta cotización/)).toHaveCount(0)
})

test('E2E un guardado ya hecho con otros datos dice su texto: el pendiente de la pestaña lo reenvía y «Recargar»', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const guardados = await vigilarGuardadosDeUnaGuardada(page, cotizacion)
  await page.goto(`/cotizaciones/${cotizacion}`)
  await tipearEnLaHoja(page, 'pub', '410')
  await botonGuardar(page).click()
  await expect(page.getByText(CAMBIOS_GUARDADOS)).toBeVisible()
  const intento = guardados.pedidos[0]?.intento
  if (intento === undefined) {
    throw new Error('No se vio el guardado.')
  }
  // Una pestaña que quedó con ese intento pendiente pero con otras entradas, sin tipear nada: «Guardar» está encendido.
  const pendiente = {
    intento,
    cotizacionId: cotizacion,
    actualizadoEn: '2026-11-04T00:00:00.000000+00:00',
    entradas: { inputs: { pub: 999 }, banderas: {}, overrides: {} },
    modoTc: null,
    verTotalBs: false,
    titulo: null,
    notas: null,
    vehiculoId: null,
  }
  const clave = `cotizar-guardada-pendiente:${idDePersona(duena)}:${cotizacion}`
  await page.evaluate(
    ([k, v]) => window.sessionStorage.setItem(k as string, v as string),
    [clave, JSON.stringify(pendiente)],
  )
  await page.reload()
  await expect(botonGuardar(page)).toBeEnabled()
  await botonGuardar(page).click()
  await expect(
    page.getByText('Este guardado ya se hizo con otros datos. Recarga la cotización.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recargar' })).toBeVisible()
})

test('E2E quien sólo ve la cotización no deja borrador ni pendiente', async ({ page }) => {
  await entrar(page, vera, { fresco: true })
  await page.goto(`/cotizaciones/${cotizacion}`)
  await expect(page.getByText('Sólo lectura: no puedes guardar esta cotización.')).toBeVisible()
  await expect(botonGuardar(page)).toHaveCount(0)
  await page.reload()
  const claves = await page.evaluate(() =>
    Object.keys(window.sessionStorage).filter((k) => k.includes('cotizar-guardada')),
  )
  expect(claves).toEqual([])
})
