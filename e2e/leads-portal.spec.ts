import { formatearNumero } from '../src/shared/lib/formato'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { idDe } from './soporte/leads'
import { bloqueDeCartera, panelDeCartera, rpcComo } from './soporte/leads-cartera'
import { esMovil } from './soporte/inventario'
import { cabeEnLaPantalla, completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead } from './soporte/leads-ficha'
import {
  CON_ESTA_CLAVE,
  GENERAR,
  accesoEnLaBase,
  actividadDelPortal,
  dialogoDeOtorgar,
  fijarDireccionDeLaWeb,
  limpiarPortal,
  loginDelCliente,
  nombreDeLaEmpresa,
  otorgarComo,
  prepararPortal,
  seccionPortal,
  snapshotDelCliente,
  type TerrenoDelPortal,
} from './soporte/leads-portal'
import { PRESUPUESTO_DE_LA_FICHA_EN_KB } from './soporte/presupuestos'

// La sección «Portal» de la ficha (`?seccion=portal`): el acceso del cliente, del lado del equipo. Dar
// acceso con una clave escrita o generada (el código en grande, la clave una sola vez y el texto para
// WhatsApp), volver a otorgar con versión, revocar con confirmación, desbloquear y el aviso al
// transferir. La clave nunca queda en la base en claro, ni en `actividad`, ni en la URL.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelPortal

test.beforeAll(async ({}, info) => {
  t = await prepararPortal(info.project.name)
})

test.afterAll(async () => {
  await limpiarPortal(t)
})

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
})

const leadDePia = (corto: string) =>
  nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: t.pia.email })

const irAPortal = (page: Parameters<typeof irAFicha>[0], leadId: string) =>
  irAFicha(page, leadId, '?seccion=portal')

const CODIGO = /^[A-Z]{2,4}-[2-9A-HJ-NP-Z]{5}$/

test('dar acceso con una clave escrita: el código en grande, el texto sin enlace y la clave que no queda', async ({
  page,
}, info) => {
  await fijarDireccionDeLaWeb(null)
  const lead = await leadDePia(`Portal Escrita ${info.project.name}`)
  const empresa = await nombreDeLaEmpresa()
  await entrar(page, t.pia.email)
  await irAPortal(page, lead.id)
  await expect(seccionPortal(page).getByText('Todavía no tiene acceso al portal')).toBeVisible()
  await seccionPortal(page).getByRole('button', { name: 'Dar acceso' }).click()
  await expect(page).toHaveURL(/panel=otorgar-portal/)
  const dialogo = dialogoDeOtorgar(page)
  // Un solo botón principal, que dice lo que va a hacer con lo que hay en el campo.
  await expect(dialogo.getByRole('button')).toHaveText(['Cancelar', GENERAR, 'Cerrar'])
  if (!esMovil(page)) {
    await expect(dialogo.getByLabel('Clave temporal')).toBeFocused()
  }
  await dialogo.getByLabel('Clave temporal').fill('corta')
  await expect(dialogo.getByRole('button', { name: GENERAR })).toHaveCount(0)
  await dialogo.getByRole('button', { name: CON_ESTA_CLAVE }).click()
  await expect(dialogo.getByText('La clave necesita al menos 8 caracteres.')).toBeVisible()
  const clave = `Escrita-${info.project.name}-9`
  await dialogo.getByLabel('Clave temporal').fill(clave)
  await dialogo.getByRole('button', { name: CON_ESTA_CLAVE }).click()

  const listo = page.getByRole('dialog', { name: `${lead.nombre} ya tiene acceso al portal` })
  const codigo = (await listo.getByLabel(/^Código:/).textContent()) ?? ''
  expect(codigo).toMatch(CODIGO)
  await expect(listo.getByLabel('Clave temporal')).toHaveText(clave)
  const texto = listo.getByLabel('Texto para WhatsApp')
  await expect(texto).toContainText(`Hola, ${lead.nombre}.`)
  await expect(texto).toContainText(`entra en la web de ${empresa} con estos datos:`)
  await expect(texto).toContainText(`Código: ${codigo}`)
  await expect(texto).toContainText(`Clave temporal: ${clave}`)
  await expect(texto).not.toContainText('http')
  await expect(listo.getByText('Todavía no hay una dirección de la web configurada')).toBeVisible()
  await listo.getByRole('button', { name: 'Copiar código' }).click()
  await expect(listo.getByRole('button', { name: 'Copiado' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(codigo)
  // Ni la URL ni la base la tienen en claro; `actividad`, sólo el código.
  expect(page.url()).not.toContain(clave)
  const fila = await accesoEnLaBase(lead.id)
  expect(fila?.codigo).toBe(codigo)
  expect(fila?.clave_hash.startsWith('$2a$10$')).toBe(true)
  expect(fila?.clave_hash).not.toContain(clave)
  const actividad = await actividadDelPortal(lead.id)
  expect(actividad).toContain('portal.otorgado')
  expect(actividad).toContain(codigo)
  expect(actividad).not.toContain(clave)
  // El cliente entra con lo que se le dictó, aunque lo teclee en minúsculas y con espacios.
  expect(await loginDelCliente(codigo.toLowerCase().replace('-', ' '), clave)).not.toBeNull()

  await listo.getByRole('button', { name: 'Listo' }).click()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(seccionPortal(page).getByText('Activo', { exact: true })).toBeVisible()
  await expect(seccionPortal(page).getByText(codigo, { exact: true })).toBeVisible()
  await expect(page.getByText(clave)).toHaveCount(0)
})

test('«Generar»: diez símbolos dictables, el enlace si la web tiene dirección, y al volver no está', async ({
  page,
}, info) => {
  await fijarDireccionDeLaWeb('https://sitio-de-prueba.example')
  const lead = await leadDePia(`Portal Generar ${info.project.name}`)
  await entrar(page, t.pia.email)
  await irAPortal(page, lead.id)
  await seccionPortal(page).getByRole('button', { name: 'Dar acceso' }).click()
  await dialogoDeOtorgar(page).getByRole('button', { name: GENERAR }).click()
  const listo = page.getByRole('dialog', { name: `${lead.nombre} ya tiene acceso al portal` })
  const clave = (await listo.getByLabel('Clave temporal').textContent()) ?? ''
  expect(clave).toMatch(/^[2-9A-HJ-NP-Z]{10}$/)
  // En el celular entra en la pantalla y «Listo» se alcanza desplazando el cuerpo.
  if (esMovil(page)) {
    await cabeEnLaPantalla(page, listo)
    await expect(listo.getByRole('button', { name: 'Listo' })).toBeInViewport()
  }
  await expect(listo.getByText(/^Se dice: /)).toHaveCount(2)
  await expect(listo.getByLabel('Texto para WhatsApp')).toContainText(
    'entra en https://sitio-de-prueba.example con estos datos:',
  )
  await expect(listo.getByText('Todavía no hay una dirección de la web configurada')).toHaveCount(0)
  const codigo = (await listo.getByLabel(/^Código:/).textContent()) ?? ''
  expect(await loginDelCliente(codigo, clave)).not.toBeNull()
  // Se va a otra pantalla sin cerrar y vuelve: Next conserva la pantalla, pero no la clave.
  await page.goto('/leads')
  await page.goBack()
  await expect(page).toHaveURL(/panel=otorgar-portal/)
  await expect(dialogoDeOtorgar(page).getByLabel('Clave temporal')).toHaveValue('')
  await expect(page.getByText(clave)).toHaveCount(0)
})

test('volver a otorgar con la versión: si otra persona otorgó antes, lo dice y lo escrito queda', async ({
  page,
}, info) => {
  const lead = await leadDePia(`Portal Conflicto ${info.project.name}`)
  const { error } = await rpcComo(t.pia.email, 'lead_compartir', {
    p_lead: lead.id,
    p_usuario: await idDe(t.paco.email),
  })
  expect(error).toBeNull()
  const primero = await otorgarComo(t.pia.email, lead.id, 'clave-primera-1')
  await entrar(page, t.pia.email)
  await irAPortal(page, lead.id)
  await seccionPortal(page).getByRole('button', { name: 'Volver a otorgar' }).click()
  const dialogo = dialogoDeOtorgar(page)
  await expect(
    dialogo.getByText(`El código ${primero.codigo} y su clave dejan de valer`),
  ).toBeVisible()
  // Paco lo vuelve a otorgar mientras tanto.
  await otorgarComo(t.paco.email, lead.id, 'clave-de-paco-1')
  await dialogo.getByLabel('Clave temporal').fill('clave-de-pia-2')
  await dialogo.getByRole('button', { name: CON_ESTA_CLAVE }).click()
  await expect(dialogo.getByText(/Ya lo otorgó Paco Portal hace un momento/)).toBeVisible()
  await expect(dialogo.getByLabel('Clave temporal')).toHaveValue('clave-de-pia-2')
  // Hasta que llega la versión de Paco no se puede volver a otorgar (si no, chocaría otra vez).
  await expect(dialogo.getByRole('button', { name: CON_ESTA_CLAVE })).toBeDisabled()
  await dialogo.getByRole('button', { name: 'Recargar' }).click()
  await expect(dialogo.getByText(/Ya lo otorgó Paco Portal/)).toHaveCount(0)
  await expect(dialogo.getByText(`El código ${primero.codigo} y su clave`)).toHaveCount(0)
  await expect(dialogo.getByLabel('Clave temporal')).toHaveValue('clave-de-pia-2')
  await dialogo.getByRole('button', { name: CON_ESTA_CLAVE }).click()
  await expect(
    page.getByRole('dialog', { name: `${lead.nombre} ya tiene acceso al portal` }),
  ).toBeVisible()
  expect(
    await loginDelCliente((await accesoEnLaBase(lead.id))?.codigo ?? '', 'clave-de-pia-2'),
  ).not.toBeNull()
})

test('mientras otorga no se cierra ni se toca el campo; al terminar muestra el acceso', async ({
  page,
}, info) => {
  const lead = await leadDePia(`Portal En Curso ${info.project.name}`)
  await entrar(page, t.pia.email)
  await irAPortal(page, lead.id)
  await seccionPortal(page).getByRole('button', { name: 'Dar acceso' }).click()
  // La action se demora hasta que la prueba la suelta.
  let soltar: () => void = () => undefined
  const espera = new Promise<void>((resolver) => {
    soltar = resolver
  })
  await page.route('**/leads/**', async (ruta) => {
    if (ruta.request().method() === 'POST' && ruta.request().headers()['next-action']) {
      await espera
    }
    await ruta.fallback()
  })
  const dialogo = dialogoDeOtorgar(page)
  await dialogo.getByRole('button', { name: GENERAR }).click()
  await expect(dialogo.getByRole('button', { name: 'Otorgando…' })).toBeDisabled()
  await expect(dialogo.getByLabel('Clave temporal')).toBeDisabled()
  await expect(dialogo.getByRole('button', { name: 'Cerrar' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeVisible()
  soltar()
  await expect(
    page.getByRole('dialog', { name: `${lead.nombre} ya tiene acceso al portal` }),
  ).toBeVisible()
  await page.unrouteAll({ behavior: 'ignoreErrors' })
})

test('revocar pide confirmación, corta la sesión del cliente y deja volver a otorgar', async ({
  page,
}, info) => {
  const lead = await leadDePia(`Portal Revocar ${info.project.name}`)
  const otorgado = await otorgarComo(t.pia.email, lead.id, 'clave-revocar-1')
  const sesion = await loginDelCliente(otorgado.codigo, 'clave-revocar-1')
  expect(sesion).not.toBeNull()
  await entrar(page, t.pia.email)
  await irAPortal(page, lead.id)
  await seccionPortal(page).getByRole('button', { name: 'Revocar' }).click()
  await expect(page).toHaveURL(/panel=revocar-portal/)
  const confirmar = page.getByRole('dialog', { name: `Revocar el acceso de ${lead.nombre}` })
  await expect(
    confirmar.getByText(`El código ${otorgado.codigo} deja de valer ahora`),
  ).toBeVisible()
  await confirmar.getByRole('button', { name: 'Revocar acceso' }).click()
  await expect(page.getByText(`Se revocó el acceso de ${lead.nombre} al portal.`)).toBeVisible()
  await expect(seccionPortal(page).getByText('Revocado', { exact: true })).toBeVisible()
  await expect(seccionPortal(page).getByText(/Lo revocó Pía Portal/)).toBeVisible()
  expect((await accesoEnLaBase(lead.id))?.habilitado).toBe(false)
  expect(await snapshotDelCliente(lead.id, sesion?.otorgado_en ?? '')).toBeNull()
  await expect(seccionPortal(page).getByRole('button', { name: 'Volver a otorgar' })).toBeVisible()
  await expect(seccionPortal(page).getByRole('button', { name: 'Revocar' })).toHaveCount(0)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('bloqueado tras cinco fallos: dice hasta qué hora y «Desbloquear» lo limpia', async ({
  page,
}, info) => {
  const lead = await leadDePia(`Portal Bloqueo ${info.project.name}`)
  const otorgado = await otorgarComo(t.pia.email, lead.id, 'clave-bloqueo-1')
  for (let i = 0; i < 5; i += 1) {
    expect(await loginDelCliente(otorgado.codigo, `mala-${String(i)}`)).toBeNull()
  }
  await entrar(page, t.pia.email)
  await irAPortal(page, lead.id)
  await expect(seccionPortal(page).getByText('Bloqueado', { exact: true })).toBeVisible()
  await expect(seccionPortal(page).getByText(/no puede entrar hasta las \d{2}:\d{2}/)).toBeVisible()
  await seccionPortal(page).getByRole('button', { name: 'Desbloquear' }).click()
  await expect(page.getByText('Listo: ya puede volver a intentar.')).toBeVisible()
  await expect(seccionPortal(page).getByText('Activo', { exact: true })).toBeVisible()
  const fila = await accesoEnLaBase(lead.id)
  expect(fila?.intentos_fallidos).toBe(0)
  expect(fila?.bloqueado_hasta).toBeNull()
  expect(await loginDelCliente(otorgado.codigo, 'clave-bloqueo-1')).not.toBeNull()
})

test('transferir un lead con acceso vigente avisa que el cliente verá al nuevo asesor', async ({
  page,
}, info) => {
  const lead = await leadDePia(`Portal Transferir ${info.project.name}`)
  await otorgarComo(t.pia.email, lead.id, 'clave-transferir-1')
  await entrar(page, t.pia.email)
  await irAFicha(page, lead.id)
  await bloqueDeCartera(page).getByRole('button', { name: 'Transferir' }).click()
  const panel = panelDeCartera(page, 'Transferir lead')
  await expect(
    panel.getByText(
      `${lead.nombre} tiene acceso al portal: verá como su asesor a quien se lo pases.`,
    ),
  ).toBeVisible()
  await panel.getByRole('radio', { name: 'Paco Portal' }).check()
  await expect(
    panel.getByText(
      `${lead.nombre} tiene acceso al portal: desde ahora verá a Paco Portal como su asesor.`,
    ),
  ).toBeVisible()
})

test('en modo oscuro el código y el texto se leen igual', async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  const lead = await leadDePia(`Portal Oscuro ${info.project.name}`)
  await entrar(page, t.pia.email)
  await irAPortal(page, lead.id)
  await seccionPortal(page).getByRole('button', { name: 'Dar acceso' }).click()
  await dialogoDeOtorgar(page).getByRole('button', { name: GENERAR }).click()
  const listo = page.getByRole('dialog', { name: `${lead.nombre} ya tiene acceso al portal` })
  const codigo = listo.getByLabel(/^Código:/)
  await expect(codigo).toBeVisible()
  const [color, fondo] = await codigo.evaluate((nodo) => {
    const estilo = getComputedStyle(nodo)
    const caja = getComputedStyle(nodo.parentElement ?? nodo)
    return [estilo.color, caja.backgroundColor]
  })
  expect(color).not.toBe(fondo)
  expect(
    await page.evaluate(
      () =>
        document.documentElement.classList.contains('dark') ||
        matchMedia('(prefers-color-scheme: dark)').matches,
    ),
  ).toBe(true)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('lo que aporta la ficha con la sección «Portal»', async ({ page }, info) => {
  const lead = await leadDePia(`Portal Pesa ${info.project.name}`)
  await otorgarComo(t.pia.email, lead.id, 'clave-pesa-1')
  await entrar(page, t.pia.email)
  const largo = async (ruta: string) =>
    ((await (await page.goto(ruta))?.body())?.length ?? 0) as number
  const kb = (bytes: number) => formatearNumero(bytes / 1024, { decimales: 1 })
  const base = await largo('/perfil')
  const datos = await largo(`/leads/${lead.id}`)
  const portal = await largo(`/leads/${lead.id}?seccion=portal`)
  const resumen = `«Datos» aporta ${kb(datos - base)} KB · «Portal» aporta ${kb(portal - base)} KB`
  console.warn(`[ficha con portal] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'KB de la ficha con portal', description: resumen })
  expect(datos - base).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_EN_KB * 1024)
  expect(portal - base).toBeLessThan(PRESUPUESTO_DE_LA_FICHA_EN_KB * 1024)
})
