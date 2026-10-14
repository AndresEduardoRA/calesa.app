import { expect, test, type Page } from '@playwright/test'
import {
  abrirConN,
  dialogo,
  entrar,
  limpiarAlta,
  prepararAlta,
  CONTRASENA,
  type PersonasDelAlta,
} from './soporte/alta'
import { borrarCamposDeLeadDePrueba } from './soporte/leads'
import {
  codigoDePaisDeLaEmpresa,
  crearCampoDePrueba,
  dejarActivosLosOrigenes,
  leadsConTelefono,
  seguimientosDe,
  sesionDe,
  telefonoAlAzar,
} from './soporte/leads-alta'

// Lo que no sale bien a la primera, contra la app compilada y el Supabase local.
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar = async () => {}
let codigo = ''

test.beforeAll(async ({}, info) => {
  const terreno = await prepararAlta(`${info.project.name}-casos`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
  codigo = await codigoDePaisDeLaEmpresa()
})

test.afterAll(async () => {
  await limpiarAlta(restaurar)
})

const nuevoNumero = () => {
  const nacional = telefonoAlAzar()
  return { nacional, normalizado: `${codigo}${nacional}` }
}

// Llena el paso de los datos y pasa al seguimiento con Ctrl+Enter.
async function llenarYSeguir(page: Page, telefono: string, nombre: string) {
  const panel = dialogo(page)
  await panel.getByLabel('Teléfono principal').fill(telefono)
  await panel.getByLabel('Nombre', { exact: true }).fill(nombre)
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByLabel('Resumen')).toBeVisible()
}

test('se cae la conexión al guardar: el drawer lo conserva todo y guarda una sola vez al volver', async ({
  page,
  context,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  const nombre = `E2E Sin red ${info.project.name}`
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await llenarYSeguir(page, nacional, nombre)
  await panel.getByLabel('Resumen').fill('Llamó por la camioneta')

  await context.setOffline(true)
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByText(/No hay conexión\. Lo que escribiste sigue acá/)).toBeVisible()
  await expect(panel.getByLabel('Resumen')).toHaveValue('Llamó por la camioneta')
  expect(await leadsConTelefono(normalizado)).toHaveLength(0)

  await context.setOffline(false)
  await expect(page.getByText(/Lead #\d+ creado/)).toBeVisible()
  expect(await leadsConTelefono(normalizado)).toHaveLength(1)
})

test('la respuesta se perdió pero el lead entró: reintentar no duplica', async ({ page }, info) => {
  const { nacional, normalizado } = nuevoNumero()
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await llenarYSeguir(page, nacional, `E2E Respuesta perdida ${info.project.name}`)
  await panel.getByLabel('Resumen').fill('Pidió una cotización')

  // El servidor recibe y guarda; el navegador nunca ve la respuesta (una vez).
  let perdida = false
  await page.route('**/*', async (ruta) => {
    const pedido = ruta.request()
    if (!perdida && pedido.method() === 'POST' && pedido.headers()['next-action']) {
      perdida = true
      await ruta.fetch()
      await ruta.abort('failed')
      return
    }
    await ruta.continue()
  })
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByText(/No pudimos llegar al servidor/)).toBeVisible()
  expect(await leadsConTelefono(normalizado)).toHaveLength(1)
  await expect(panel.getByLabel('Resumen')).toHaveValue('Pidió una cotización')

  await panel.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText(/Lead #\d+ creado/)).toBeVisible()
  const leads = await leadsConTelefono(normalizado)
  expect(leads).toHaveLength(1)
  expect(await seguimientosDe(leads[0]?.id ?? '')).toHaveLength(1)
})

test('cerrar el drawer o recargar no pierde lo tipeado', async ({ page }, info) => {
  const { nacional } = nuevoNumero()
  const nombre = `E2E Borrador ${info.project.name}`
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await panel.getByLabel('Teléfono principal').fill(nacional)
  await panel.getByLabel('Nombre', { exact: true }).fill(nombre)

  // Cerrar y volver a abrir: está todo.
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page).not.toHaveURL(/panel=nuevo-lead/)
  await abrirConN(page)
  await expect(panel.getByLabel('Teléfono principal')).toHaveValue(nacional)
  await expect(panel.getByLabel('Nombre', { exact: true })).toHaveValue(nombre)

  // Recargar la pantalla: vuelve del borrador, avisando.
  await page.reload()
  await abrirConN(page)
  await expect(panel.getByLabel('Nombre', { exact: true })).toHaveValue(nombre)
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await expect(panel.getByLabel('Teléfono principal')).toHaveValue(nacional)
})

test('un campo requerido propio vacío se dice junto al campo y lleva el foco', async ({
  page,
}, info) => {
  const { nacional } = nuevoNumero()
  await crearCampoDePrueba({
    clave: 'e2e_signo',
    etiqueta: 'E2E Signo',
    tipo: 'opcion',
    requerido: true,
    opciones: [
      { clave: 'leo', etiqueta: 'Leo' },
      { clave: 'aries', etiqueta: 'Aries' },
    ],
  })
  try {
    await entrar(page, personas.duena)
    await abrirConN(page)
    const panel = dialogo(page)
    // Está arriba, con los fijos, aunque sea propio.
    const signo = panel.getByLabel('E2E Signo (obligatorio)')
    await expect(signo).toBeVisible()
    await panel.getByLabel('Teléfono principal').fill(nacional)
    await panel.getByLabel('Nombre', { exact: true }).fill(`E2E Requerido ${info.project.name}`)
    await page.keyboard.press('Control+Enter')
    await expect(panel.getByText('Este dato es obligatorio.')).toBeVisible()
    await expect(signo).toBeFocused()
    await expect(panel.getByLabel('Resumen')).toBeHidden()

    await signo.selectOption('leo')
    await page.keyboard.press('Control+Enter')
    await panel.getByLabel('Resumen').fill('Ya tiene signo')
    await page.keyboard.press('Control+Enter')
    await expect(page.getByText(/Lead #\d+ creado/)).toBeVisible()
  } finally {
    await borrarCamposDeLeadDePrueba()
  }
})

test('sin leads.crear no hay botón, ni atajo, ni URL, y la base lo rechaza', async ({ page }) => {
  await entrar(page, personas.sinCrear)
  await expect(page.getByRole('button', { name: 'Nuevo lead' })).toHaveCount(0)
  await page.keyboard.press('n')
  await expect(dialogo(page)).toHaveCount(0)
  await page.goto('/?panel=nuevo-lead')
  await expect(dialogo(page)).toHaveCount(0)

  const sesion = await sesionDe(personas.sinCrear, CONTRASENA)
  const intento = await sesion.rpc('crear_lead', {
    p_id: crypto.randomUUID(),
    p_lead: { nombre: 'E2E No debería', telefono_principal: '+59179999999' },
  })
  expect(intento.error?.code).toBe('42501')
  const verificar = await sesion.rpc('verificar_telefono', { p_cc: '', p_tel: '+59179999999' })
  expect(verificar.error?.code).toBe('42501')
})

test('con orígenes de lead apagados el drawer no ofrece el apagado, y sin ninguno se guarda sin origen', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  try {
    await dejarActivosLosOrigenes(['web'])
    await entrar(page, personas.duena)
    await abrirConN(page)
    const panel = dialogo(page)
    const origen = panel.getByLabel('Origen del lead')
    await expect(origen.locator('option')).toHaveText(['Web'])

    await page.keyboard.press('Escape')
    await dejarActivosLosOrigenes([])
    await page.reload()
    await abrirConN(page)
    await expect(origen).toBeDisabled()
    await expect(
      panel.getByText('No hay un origen de lead activo: se guarda sin origen.'),
    ).toBeVisible()
    await llenarYSeguir(page, nacional, `E2E Sin origen ${info.project.name}`)
    await panel.getByLabel('Resumen').fill('Sin origen todavía')
    await page.keyboard.press('Control+Enter')
    await expect(page.getByText(/Lead #\d+ creado/)).toBeVisible()
    expect((await leadsConTelefono(normalizado))[0]?.origen_lead_id).toBeNull()
  } finally {
    await dejarActivosLosOrigenes(['facebook', 'web'])
  }
})

test('un recordatorio con fecha pasada se rechaza junto al campo y no guarda nada', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await llenarYSeguir(page, nacional, `E2E Pasado ${info.project.name}`)
  await panel.getByLabel('Resumen').fill('Recordar ayer')
  await panel.getByLabel('Fecha y hora').fill('2020-01-01T09:00')
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByText('El recordatorio tiene que ser en el futuro.')).toBeVisible()
  await expect(panel.getByLabel('Fecha y hora')).toBeFocused()
  expect(await leadsConTelefono(normalizado)).toHaveLength(0)

  await panel.getByRole('button', { name: 'Quitar' }).click()
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText(/Lead #\d+ creado/)).toBeVisible()
})

test('un privado lo llena y lo ve quien queda en la cartera, y no quien sólo ve el lead', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  const nombre = `E2E Privado ${info.project.name}`
  await crearCampoDePrueba({
    clave: 'e2e_reservado',
    etiqueta: 'E2E Reservado',
    tipo: 'documento',
    soloCartera: true,
  })
  try {
    await entrar(page, personas.duena)
    await abrirConN(page)
    const panel = dialogo(page)
    await panel.getByLabel('Teléfono principal').fill(nacional)
    await panel.getByLabel('Nombre', { exact: true }).fill(nombre)
    // Plegado en «Más datos»: quien crea queda en la cartera y lo puede llenar.
    await panel.getByText('Más datos').click()
    await panel.getByLabel('E2E Reservado (solo la cartera)').fill('CI 4455 LP')
    await page.keyboard.press('Control+Enter')
    await panel.getByLabel('Resumen').fill('Dejó su documento')
    await page.keyboard.press('Control+Enter')
    await expect(page.getByText(/Lead #\d+ creado/)).toBeVisible()

    const [lead] = await leadsConTelefono(normalizado)
    const delDueno = await sesionDe(personas.duena, CONTRASENA)
    const suyo = await delDueno
      .from('leads_vista')
      .select('atributos')
      .eq('id', lead?.id ?? '')
      .single<{ atributos: Record<string, unknown> }>()
    expect(suyo.data?.atributos).toMatchObject({ e2e_reservado: 'CI 4455 LP' })

    // Ve todos los leads pero no está en la cartera de éste: el privado no le llega.
    const ajena = await sesionDe(personas.veTodos, CONTRASENA)
    const visto = await ajena
      .from('leads_vista')
      .select('nombre, atributos')
      .eq('id', lead?.id ?? '')
      .single<{ nombre: string; atributos: Record<string, unknown> }>()
    expect(visto.data?.nombre).toBe(nombre)
    expect(visto.data?.atributos).not.toHaveProperty('e2e_reservado')
  } finally {
    await borrarCamposDeLeadDePrueba()
  }
})

test('dos personas guardan el mismo teléfono a la vez: una lo crea y la otra ve «existe»', async ({
  page,
  browser,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  const otra = await browser.newContext({
    baseURL: String(info.project.use.baseURL),
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
    ...(page.viewportSize() ? { viewport: page.viewportSize() } : {}),
  })
  const paginaOtra = await otra.newPage()
  try {
    await entrar(page, personas.duena)
    await entrar(paginaOtra, personas.veTodos)
    await abrirConN(page)
    await abrirConN(paginaOtra)
    // Las dos llegan al seguimiento con el teléfono libre.
    await llenarYSeguir(page, nacional, `E2E Carrera A ${info.project.name}`)
    await llenarYSeguir(paginaOtra, nacional, `E2E Carrera B ${info.project.name}`)
    await dialogo(page).getByLabel('Resumen').fill('Primera')
    await dialogo(paginaOtra).getByLabel('Resumen').fill('Segunda')

    await Promise.all([
      page.keyboard.press('Control+Enter'),
      paginaOtra.keyboard.press('Control+Enter'),
    ])

    // Una creó; la otra volvió a los datos diciendo que ya existe, con todo lo suyo intacto.
    await expect.poll(async () => (await leadsConTelefono(normalizado)).length).toBe(1)
    const creoA = await page.getByText(/Lead #\d+ creado/).isVisible()
    const perdedora = creoA ? paginaOtra : page
    await expect(perdedora.getByText(/Ya existe: E2E Carrera|Lo tiene /)).toBeVisible()
    await expect(dialogo(perdedora).getByLabel('Nombre', { exact: true })).not.toHaveValue('')
    expect(await leadsConTelefono(normalizado)).toHaveLength(1)
  } finally {
    await otra.close()
  }
})
