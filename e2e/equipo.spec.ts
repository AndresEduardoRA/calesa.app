import { expect, test, type Browser, type Page } from './soporte/prueba'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  concesionesDelRol,
  correoDePrueba,
  crearDuenaDePrueba,
  hayEquipoQueImpide,
  rolesDe,
} from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { ingresar } from './soporte/pasos'

// Equipo y roles contra la app compilada y el Supabase local. Una sola historia, en orden: la
// dueña crea un rol y le da permisos acotados a un origen; invita a una persona con ese rol, que
// entra y ve sólo lo que sus permisos permiten; la bloquea y queda afuera; y el guardián no deja
// al equipo sin quien lo administre. Al terminar se borra todo lo que se creó.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const DUENA = 'Dalia Prueba'
const INVITADA = 'Ana Invitada'
// El permiso se acota a un origen que el propio test crea: nada depende de lo que siembre `seed.sql`.
const NOMBRE_DE_ORIGEN = 'Origen de la matriz'

let duena = ''
let invitada = ''
let rol = ''
let claveDelRol = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  origen = await crearOrigenDePrueba(NOMBRE_DE_ORIGEN, 'matriz')
  duena = correoDePrueba(`duena-equipo-${info.project.name}`)
  invitada = correoDePrueba(`invitada-${info.project.name}`)
  rol = `${PREFIJO_ROL_E2E}Ventas ${info.project.name}`
  claveDelRol = `e2e_ventas_${info.project.name}`
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: DUENA })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
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

test('la dueña crea un rol y le da permisos acotados a un origen', async ({ page }) => {
  await entrar(page, duena)

  // Llega por su menú: Configuración → Roles y permisos.
  await page.getByRole('button', { name: `Menú de ${DUENA}` }).click()
  await page.getByRole('menuitem', { name: 'Configuración' }).click()
  await expect(page).toHaveURL('/configuracion')
  await page.getByRole('link', { name: /Roles y permisos/ }).click()
  await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()

  await page.getByRole('button', { name: 'Nuevo rol' }).click()
  await page.getByLabel('Nombre del rol').fill(rol)
  await page.getByRole('button', { name: 'Crear rol' }).click()
  await expect(page.getByText(`Rol «${rol}» creado`)).toBeVisible()

  // Un permiso de sí o no: un interruptor.
  const tareas = page.getByRole('switch', { name: `Recibir tareas para ${rol}` })
  await tareas.click()
  await expect(tareas).toBeChecked()

  // Un permiso que se acota por origen: se da sólo en el origen creado por el test.
  await page.getByRole('button', { name: `Ver vehículos para ${rol}: No. Cambiar` }).click()
  const enElOrigen = page.getByRole('switch', {
    name: `Ver vehículos para ${rol}: ${origen.nombre}`,
  })
  await enElOrigen.click()
  await expect(enElOrigen).toBeChecked()
  await page.keyboard.press('Escape')
  // La celda lo resume con el nombre del origen, que sale de la base.
  await expect(
    page.getByRole('button', {
      name: `Ver vehículos para ${rol}: ${origen.nombre} · todo. Cambiar`,
    }),
  ).toBeVisible()

  // Lo que quedó en la base: acotado a ese origen, y nada más que lo que se le dio.
  const concesiones = await concesionesDelRol(rol)
  expect(concesiones).toHaveLength(2)
  expect(concesiones).toContainEqual({
    permiso_clave: 'vehiculos.ver',
    origen_id: origen.id,
    alcance: 'todos',
  })
  expect(concesiones).toContainEqual({
    permiso_clave: 'agenda.tareas.recibir',
    origen_id: null,
    alcance: 'todos',
  })
})

test('una persona invitada entra con su rol y ve sólo lo que sus permisos permiten', async ({
  page,
  browser,
}) => {
  await entrar(page, duena)
  await page.goto('/configuracion/equipo')

  await page.getByRole('button', { name: 'Invitar' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Correo', { exact: true }).fill(invitada)
  await dialogo.getByLabel('Nombre y apellido').fill(INVITADA)
  await dialogo.getByLabel('Rol con el que entra').selectOption({ label: rol })
  await dialogo.getByRole('button', { name: 'Invitar' }).click()
  await expect(dialogo.getByText('Le enviamos la invitación')).toBeVisible()

  // El enlace para pasárselo a mano. Generarlo deja sin efecto al del correo.
  await dialogo.getByRole('button', { name: 'Copiar enlace' }).click()
  const enlace = new URL(await dialogo.getByLabel('Enlace de invitación').inputValue())
  expect(enlace.searchParams.get('type')).toBe('invite')
  await dialogo.getByRole('button', { name: 'Listo' }).click()
  await expect(page.getByText('Invitación pendiente')).toBeVisible()

  // La invitada abre el enlace en su navegador, elige su contraseña y queda adentro.
  const suya = await otraPersona(browser, page)
  await suya.goto(`${enlace.pathname}${enlace.search}`)
  await expect(suya).toHaveURL('/auth/nueva-contrasena')
  await suya.getByLabel('Contraseña nueva').fill(CLAVE)
  await suya.getByLabel('Repetir la contraseña').fill(CLAVE)
  await suya.getByRole('button', { name: 'Guardar y entrar' }).click()
  await expect(suya).toHaveURL('/')
  expect(await rolesDe(invitada)).toEqual([claveDelRol])

  // Su bandeja: el bloque del permiso que tiene, y ninguno de los que no.
  await expect(suya.getByRole('heading', { name: 'Mis tareas' })).toBeVisible()
  await expect(suya.getByRole('heading', { name: 'Recordatorios de hoy' })).toBeHidden()
  await expect(suya.getByRole('heading', { name: 'Personas sin rol' })).toBeHidden()

  // Su menú no ofrece Configuración ni «Ver como», y por URL tampoco entra.
  await suya.getByRole('button', { name: `Menú de ${INVITADA}` }).click()
  await expect(suya.getByRole('menuitem', { name: 'Mi perfil' })).toBeVisible()
  await expect(suya.getByRole('menuitem', { name: 'Configuración' })).toBeHidden()
  await expect(suya.getByText('Ver como')).toBeHidden()
  for (const ruta of ['/configuracion', '/configuracion/roles', '/configuracion/equipo']) {
    await suya.goto(ruta)
    await expect(suya.getByText('No tienes permiso para ver esto')).toBeVisible()
  }
  await suya.context().close()

  // Del lado de la dueña la invitación dejó de estar pendiente.
  await page.reload()
  await expect(page.getByText('Invitación pendiente')).toBeHidden()
})

test('la dueña bloquea a alguien y esa persona queda afuera', async ({ page, browser }) => {
  await entrar(page, duena)
  // La invitada tiene su sesión abierta en otro navegador.
  const suya = await otraPersona(browser, page)
  await entrar(suya, invitada)

  await page.goto('/configuracion/equipo')
  await page.getByRole('button', { name: `Acciones sobre ${INVITADA}` }).click()
  await page.getByRole('menuitem', { name: 'Bloquear' }).click()
  await expect(page.getByText(`La cuenta de ${INVITADA} quedó bloqueada`)).toBeVisible()
  await expect(page.getByText('Bloqueada', { exact: true })).toBeVisible()

  // En su próxima pantalla sale, y se le dice por qué.
  await suya.goto('/perfil')
  await expect(suya).toHaveURL('/ingreso?aviso=bloqueada')
  await expect(suya.getByText('Tu cuenta está bloqueada')).toBeVisible()
  await suya.context().close()
})

test('el guardián no deja al equipo sin quien lo administre, y lo dice en claro', async ({
  page,
}) => {
  // El guardián protege a la última persona que administra: con la dueña real en la base, la de
  // prueba no lo es. Se salta en local con un aviso y corre siempre en CI.
  const impide = await hayEquipoQueImpide()
  test.skip(impide.saltar, impide.motivo)
  await entrar(page, duena)
  await page.goto('/configuracion/equipo')

  // La dueña es la única que administra: no puede quitarse el rol.
  await page.getByRole('button', { name: `Acciones sobre ${DUENA}` }).click()
  await page.getByRole('menuitem', { name: 'Cambiar sus roles' }).click()
  const suRol = page.getByRole('switch', { name: `Dueño para ${DUENA}` })
  await suRol.click()
  await expect(
    page.getByText('Siempre tiene que quedar alguien activo que gestione los roles'),
  ).toBeVisible()
  await expect(suRol).toBeChecked()
  expect(await rolesDe(duena)).toEqual(['dueno'])
})
