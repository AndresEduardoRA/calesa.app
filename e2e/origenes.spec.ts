import { expect, test, type Browser, type Page } from '@playwright/test'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  exigirEquipoSinAjenos,
} from './soporte/base'
import {
  borrarOrigenes,
  camposDelOrigen,
  campoDelOrigen,
  flujoDelOrigen,
  origenDeLaBase,
  origenPorClave,
} from './soporte/origenes'
import { ingresar } from './soporte/pasos'

// Configuración › Orígenes contra la app compilada y el Supabase local. Una sola historia, en
// orden: se crean un origen manual y uno de subasta (cada uno con su flujo y sus campos), se edita
// el layout, y se prueban los casos no felices. Al terminar se borra todo lo que se creó.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const DUENA = 'Dalia Prueba'
const MANUAL = 'Corea'
const SUBASTA = 'Subasta Japón'
const CLAVES_DE_ORIGEN = ['corea', 'subasta_japon']
const MOTIVO_SIN_PERMISO =
  'Puedes ver cómo está configurado, pero no tienes el permiso «Gestionar orígenes» para cambiarlo.'

let duena = ''
let configuradora = ''
let sinPermisos = ''
let proyecto = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await exigirEquipoSinAjenos()
  await borrarOrigenes(CLAVES_DE_ORIGEN)
  proyecto = info.project.name
  duena = correoDePrueba(`duena-origenes-${proyecto}`)
  configuradora = correoDePrueba(`configuradora-${proyecto}`)
  sinPermisos = correoDePrueba(`sinpermisos-${proyecto}`)
  await crearPersona({ email: duena, contrasena: CLAVE, nombre: DUENA })
  // Quien configura el flujo de un origen puede verlo, pero no gestionarlo.
  await crearPersona({
    email: configuradora,
    contrasena: CLAVE,
    nombre: 'Flor Flujos',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Flujos ${proyecto}`, clave: `e2e_flujos_${proyecto}` },
    permisos: ['flujos.configurar'],
  })
  await crearPersona({
    email: sinPermisos,
    contrasena: CLAVE,
    nombre: 'Sin Permisos',
    invitada: true,
  })
})

test.afterAll(async () => {
  await borrarOrigenes(CLAVES_DE_ORIGEN)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

// Otra persona, en su propio navegador (sus cookies no se mezclan con las de la dueña).
async function otraPersona(browser: Browser, page: Page): Promise<Page> {
  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  return contexto.newPage()
}

// Un aviso tapa lo que hay debajo en un celular, y el puntero que quedó encima de él lo mantiene
// abierto: se lo descarta antes de seguir.
async function descartarAviso(page: Page, texto: string) {
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: texto })
  await expect(aviso).toBeVisible()
  await aviso.getByRole('button', { name: 'Close toast' }).click()
  await expect(aviso).toBeHidden()
}

async function irADetalle(page: Page, nombre: string, seccion?: string) {
  await page.goto('/configuracion/origenes')
  await page.getByRole('link', { name: new RegExp(nombre) }).click()
  await expect(page.getByRole('heading', { name: nombre, level: 1 })).toBeVisible()
  if (seccion) {
    await page.getByRole('tab', { name: seccion }).click()
  }
}

test('se crea un origen manual y uno de subasta, cada uno con su flujo y sus campos', async ({
  page,
}) => {
  await entrar(page, duena)

  // Llega por su menú: Configuración → Orígenes. Sin orígenes propios, los sembrados se ven.
  await page.getByRole('button', { name: `Menú de ${DUENA}` }).click()
  await page.getByRole('menuitem', { name: 'Configuración' }).click()
  await page.getByRole('link', { name: /Orígenes/ }).click()
  await expect(page.getByRole('heading', { name: 'Orígenes', level: 1 })).toBeVisible()

  // Manual: el género acompaña al sustantivo hasta que la persona lo elige.
  await page.getByRole('button', { name: 'Nuevo origen' }).click()
  const panel = page.getByRole('dialog')
  await panel.getByLabel('Nombre', { exact: true }).fill(MANUAL)
  await panel.getByLabel('Lo que entra por acá se llama').fill('unidad')
  await expect(panel.getByRole('radio', { name: 'Femenino' })).toBeChecked()
  await expect(panel.getByText('«ninguna unidad en Corea todavía»')).toBeVisible()
  await panel.getByRole('button', { name: 'Crear origen' }).click()
  await expect(page.getByText(`Origen «${MANUAL}» creado`)).toBeVisible()

  // Cae en la pantalla del origen, con lo que le falta. El flujo y la fórmula no tienen pantalla
  // todavía: se dicen, sin enlace.
  await expect(page.getByRole('heading', { name: MANUAL, level: 1 })).toBeVisible()
  const pasos = page.getByRole('region', { name: `Siguientes pasos para ${MANUAL}` })
  await expect(pasos.getByText('Configura el flujo')).toBeVisible()
  await expect(pasos.getByText('Publica la fórmula')).toBeVisible()
  await expect(pasos.getByText('Se configura en una próxima etapa')).toHaveCount(2)
  await expect(pasos.getByRole('link', { name: 'Abrir' })).toHaveCount(1)

  const corea = await origenDeLaBase('corea')
  expect(corea).toMatchObject({ nombre: MANUAL, tipo: 'manual', sustantivo: 'unidad', genero: 'f' })
  expect(await flujoDelOrigen(corea.id)).toEqual({
    nombre: `Logística ${MANUAL}`,
    fases: 0,
    reglas: [
      'alerta_demora',
      'contenedor',
      'esperas',
      'gastos',
      'logistica',
      'pagos',
      'portal_cliente',
      'transporte',
      'vitrina_web',
    ],
  })
  expect(await camposDelOrigen(corea.id)).toHaveLength(8)

  // Subasta: nace con los campos mapeados a apibara y la regla de aduana.
  await page.goto('/configuracion/origenes')
  await page.getByRole('button', { name: 'Nuevo origen' }).click()
  const otro = page.getByRole('dialog')
  await otro.getByLabel('Nombre', { exact: true }).fill(SUBASTA)
  // Las opciones son radios nativos con otra piel: se elige tocando su etiqueta.
  await otro
    .locator('label')
    .filter({ hasText: /^Subasta$/ })
    .click()
  await otro.getByRole('checkbox', { name: 'Copart' }).check()
  await otro.getByRole('button', { name: 'Crear origen' }).click()
  await expect(page.getByRole('heading', { name: SUBASTA, level: 1 })).toBeVisible()

  const japon = await origenDeLaBase('subasta_japon')
  expect(japon).toMatchObject({ tipo: 'subasta', apibara_plataformas: ['copart'] })
  const campos = await camposDelOrigen(japon.id)
  expect(campos).toHaveLength(17)
  expect(campos.every((campo) => campo.clave_apibara !== null && campo.es_sistema)).toBe(true)
  expect((await flujoDelOrigen(japon.id)).reglas).toContain('aduana')
  // Un origen de subasta suma activar apibara a lo que le falta.
  await expect(
    page
      .getByRole('region', { name: `Siguientes pasos para ${SUBASTA}` })
      .getByText('Activa apibara'),
  ).toBeVisible()
})

test('un nombre repetido se dice en el campo y lo tipeado queda', async ({ page }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/origenes')
  await page.getByRole('button', { name: 'Nuevo origen' }).click()
  const panel = page.getByRole('dialog')
  await panel.getByLabel('Nombre', { exact: true }).fill(' corea ')
  await panel.getByLabel('Lo que entra por acá se llama').fill('lote')
  await panel.getByRole('button', { name: 'Crear origen' }).click()
  await expect(panel.getByText('Ya existe un origen llamado «corea».')).toBeVisible()
  await expect(panel.getByLabel('Nombre', { exact: true })).toHaveValue(' corea ')
  await expect(panel.getByLabel('Lo que entra por acá se llama')).toHaveValue('lote')
  expect(await origenPorClave('corea_2')).toBeNull()
})

test('se edita el layout de campos y se refleja', async ({ page }) => {
  await entrar(page, duena)
  await irADetalle(page, MANUAL, 'Campos')
  const corea = await origenDeLaBase('corea')

  // Una bandera guarda sola.
  const motor = page.getByRole('switch', { name: 'Motor: filtrable' })
  await expect(motor).not.toBeChecked()
  await motor.click()
  await expect(motor).toBeChecked()
  await expect.poll(async () => (await campoDelOrigen(corea.id, 'motor')).filtrable).toBe(true)

  // Subir y bajar: el orden se cambia con botones, sin arrastrar.
  await page.getByRole('button', { name: 'Bajar Color' }).click()
  await expect
    .poll(async () => (await camposDelOrigen(corea.id)).map((campo) => campo.clave).slice(0, 2))
    .toEqual(['transmision', 'color'])
  await expect(page.getByRole('button', { name: 'Subir Transmisión' })).toBeDisabled()

  // Un campo propio, con opciones.
  await page.getByRole('button', { name: 'Nuevo campo' }).click()
  const panel = page.getByRole('dialog')
  await panel.getByLabel('Nombre', { exact: true }).fill('Kit de extras')
  await panel.getByLabel('Tipo').selectOption({ label: 'Una opción' })
  await panel.getByLabel('Nueva opción').fill('Básico')
  await panel.getByLabel('Nueva opción').press('Enter')
  await panel.getByLabel('Nueva opción').fill('Full')
  await panel.getByRole('button', { name: 'Agregar' }).click()
  await panel.getByLabel('Grupo').fill('Venta')
  await panel.getByRole('button', { name: 'Crear campo' }).click()
  await descartarAviso(page, 'Campo «Kit de extras» creado')
  const kit = await campoDelOrigen(corea.id, 'kit_de_extras')
  expect(kit).toMatchObject({ tipo: 'opcion', grupo: 'Venta', es_sistema: false, activo: true })
  expect(kit.opciones.map((opcion) => opcion.etiqueta)).toEqual(['Básico', 'Full'])

  // Desactivarlo lo saca del layout (el dato se conserva) y se puede reactivar.
  await page.getByRole('button', { name: 'Editar Kit de extras' }).click()
  const edicion = page.getByRole('dialog')
  await edicion.getByRole('switch', { name: 'Activo' }).click()
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, 'Campo «Kit de extras» guardado')
  await page.getByText(/Campos desactivados \(1\)/).click()
  await page.getByRole('button', { name: 'Reactivar Kit de extras' }).click()
  await expect(page.getByText('«Kit de extras» reactivado')).toBeVisible()
  await expect.poll(async () => (await campoDelOrigen(corea.id, 'kit_de_extras')).activo).toBe(true)

  // Lo que se guardó sobrevive a recargar.
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Motor: filtrable' })).toBeChecked()
  await expect(page.getByRole('button', { name: 'Editar Kit de extras' })).toBeVisible()
})

test('un campo de sistema no cambia de tipo ni se elimina', async ({ page }) => {
  await entrar(page, duena)
  await irADetalle(page, MANUAL, 'Campos')
  await page.getByRole('button', { name: 'Editar Color' }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByLabel('Tipo')).toBeDisabled()
  await expect(panel.getByText('Es un campo del sistema')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Eliminar campo' })).toHaveCount(0)
})

test('sin el permiso, la sección sale deshabilitada y dice por qué', async ({ page, browser }) => {
  await entrar(page, configuradora)
  await page.goto('/configuracion/origenes')
  await expect(page.getByRole('heading', { name: 'Orígenes', level: 1 })).toBeVisible()
  await expect(page.getByText(MOTIVO_SIN_PERMISO)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo origen' })).toBeDisabled()

  await page.getByRole('link', { name: new RegExp(MANUAL) }).click()
  await expect(page.getByRole('heading', { name: MANUAL, level: 1 })).toBeVisible()
  await page.getByRole('tab', { name: 'Campos' }).click()
  // Next conserva la pestaña anterior oculta: sólo cuenta lo que se ve.
  await expect(page.getByText(MOTIVO_SIN_PERMISO).filter({ visible: true })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Motor: filtrable' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Subir Transmisión' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Nuevo campo' })).toBeDisabled()

  // Quien no tiene nada que ver con los orígenes no entra.
  const ajena = await otraPersona(browser, page)
  await ajena.goto('/ingreso')
  await ingresar(ajena, sinPermisos, CLAVE)
  await expect(ajena).toHaveURL('/')
  await ajena.goto('/configuracion/origenes')
  await expect(ajena.getByText('No tienes permiso para ver esto')).toBeVisible()
  await ajena.context().close()
})

test('dos personas editando el mismo origen: la segunda ve el conflicto y no pierde lo tipeado', async ({
  page,
  browser,
}) => {
  await entrar(page, duena)
  await irADetalle(page, MANUAL)
  const segunda = await otraPersona(browser, page)
  await segunda.goto('/ingreso')
  await ingresar(segunda, duena, CLAVE)
  await expect(segunda).toHaveURL('/')
  await segunda.goto(page.url())

  // La segunda guarda primero.
  await segunda.getByLabel('Nombre', { exact: true }).fill('Corea del Sur')
  await segunda.getByRole('button', { name: 'Guardar' }).click()
  await expect(segunda.getByText('Origen «Corea del Sur» guardado')).toBeVisible()

  // La primera todavía tiene la versión vieja en pantalla.
  await page.getByLabel('Nombre', { exact: true }).fill('Corea Norte')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(
    page.getByText('Otra persona cambió este origen mientras lo editabas.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recargar' })).toBeVisible()
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Corea Norte')
  expect((await origenDeLaBase('corea')).nombre).toBe('Corea del Sur')

  // Al renombrarse, el flujo acompaña al nombre.
  expect((await flujoDelOrigen((await origenDeLaBase('corea')).id)).nombre).toBe(
    'Logística Corea del Sur',
  )
  await segunda.context().close()
})

test('con la conexión caída el formulario conserva lo tipeado y avisa', async ({
  page,
  context,
}) => {
  await entrar(page, duena)
  await irADetalle(page, 'Corea del Sur')
  await page.getByLabel('Nombre', { exact: true }).fill('Corea sin red')
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText(/No hay conexión|No pudimos llegar al servidor/)).toBeVisible()
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Corea sin red')
  await context.setOffline(false)
  expect((await origenDeLaBase('corea')).nombre).toBe('Corea del Sur')
})

test('desactivar es reversible, y eliminar sólo vale sin uso', async ({ page }) => {
  await entrar(page, duena)
  await irADetalle(page, 'Corea del Sur')

  // Desactivar: se hace y se ofrece «Deshacer».
  await page.getByRole('switch', { name: 'Activo' }).click()
  await expect(page.getByText('«Corea del Sur» desactivado')).toBeVisible()
  await expect(page.getByText('Inactivo', { exact: true })).toBeVisible()
  expect((await origenDeLaBase('corea')).activo).toBe(false)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect.poll(async () => (await origenDeLaBase('corea')).activo).toBe(true)

  // Eliminar pide tipear el nombre; el origen y lo que colgaba desaparecen.
  const id = (await origenDeLaBase('subasta_japon')).id
  await page.goto('/configuracion/origenes')
  await page.getByRole('link', { name: new RegExp(SUBASTA) }).click()
  await page.getByRole('button', { name: 'Eliminar origen' }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo.getByRole('button', { name: 'Eliminar origen' })).toBeDisabled()
  await dialogo.getByLabel(/Para confirmar/).fill(SUBASTA)
  await dialogo.getByRole('button', { name: 'Eliminar origen' }).click()
  await expect(page.getByText(`Origen «${SUBASTA}» eliminado`)).toBeVisible()
  expect(await origenPorClave('subasta_japon')).toBeNull()
  expect(await camposDelOrigen(id)).toHaveLength(0)
})
