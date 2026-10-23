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
import { esMovil } from './soporte/inventario'
import { ingresar } from './soporte/pasos'
import { aLaVistaSinDesplazar, capturar, sinScrollHorizontal } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { bajaEnCurso } from './soporte/bajas'

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
  sql(`delete from public.leads where nombre like 'E2E Baja %'`)
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
  const formulario = page.getByRole('dialog', { name: 'Invitar a una persona' })
  await formulario.getByLabel('Correo', { exact: true }).fill(invitada)
  await formulario.getByLabel('Nombre y apellido').fill(INVITADA)
  await formulario.getByLabel('Rol con el que entra').selectOption({ label: rol })
  await formulario.getByRole('button', { name: 'Invitar' }).click()
  // Hecha la invitación, otro modal dice qué pasó con ella (el del formulario se va).
  const dialogo = page.getByRole('dialog', { name: 'Invitación creada' })
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

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('la dueña bloquea a alguien y esa persona queda afuera', async ({ page, browser }) => {
  await entrar(page, duena)
  // La invitada tiene su sesión abierta en otro navegador.
  const suya = await otraPersona(browser, page)
  await entrar(suya, invitada)

  await page.goto('/configuracion/equipo')
  await page.getByRole('button', { name: `Más acciones de ${INVITADA}` }).click()
  await page.getByRole('menuitem', { name: 'Bloquear' }).click()
  await expect(page.getByText(`La cuenta de ${INVITADA} quedó bloqueada`)).toBeVisible()
  await expect(page.getByText('Bloqueada', { exact: true })).toBeVisible()

  // En su próxima pantalla sale, y se le dice por qué.
  await suya.goto('/perfil')
  await expect(suya).toHaveURL('/ingreso?aviso=bloqueada')
  await expect(suya.getByText('Tu cuenta está bloqueada')).toBeVisible()
  await suya.context().close()
})

// Cierre 1: la baja dice cuántos leads van al limbo antes de confirmar, y mientras sus leads se pasan por lotes la lista lo
// dice («Pasando sus leads…»). La baja en curso se deja a mano (con 5.000 leads o menos termina en la llamada).
test('la dueña da de baja a alguien con leads, y una baja en curso se dice en la lista', async ({
  page,
}, info) => {
  const sufijo = info.project.name === 'escritorio' ? '1' : '2'
  sql(`with p as (select id from public.perfiles where email = ${literal(invitada)}),
            l as (insert into public.leads (nombre, telefono_principal, creado_por)
                  select 'E2E Baja ' || g, '7990' || ${literal(sufijo)} || lpad(g::text, 3, '0'), p.id from p, generate_series(1, 2) g returning id, creado_por)
       insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) select id, creado_por, 'dueno' from l`)
  await entrar(page, duena)
  await page.goto('/configuracion/equipo')
  await page.getByRole('button', { name: `Más acciones de ${INVITADA}` }).click()
  await page.getByRole('menuitem', { name: 'Dar de baja' }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo.getByText('2 leads irán al limbo')).toBeVisible()
  await capturar(page, info, 'equipo-baja-01-confirmar')
  await dialogo.getByRole('button', { name: 'Dar de baja' }).click()
  await expect(
    page.getByText(`${INVITADA} ya no forma parte del equipo. 2 leads quedaron en el limbo.`),
  ).toBeVisible()
  expect(
    sql(`select count(*) from public.leads where nombre like 'E2E Baja %' and cartera = '{}'`),
  ).toBe('2')

  // Una baja en curso que el job no puede cerrar: un lead suyo sigue en su cartera, tomado por otra transacción (5a-32).
  const lead = await bajaEnCurso(invitada, `7990${sufijo}003`)
  try {
    // El job corre en medio, como a la hora en punto de cada minuto: salta el lead tomado y la baja sigue en curso.
    sql('select public.equipo_bajas_continuar()')
    await page.goto('/configuracion/equipo')
    await page.getByLabel('Estado').selectOption('baja')
    // Una fila de la tabla (desde 768 px) o una tarjeta (por debajo).
    const fila = page.locator('tr, article').filter({ hasText: INVITADA })
    await expect(fila.getByText('Dada de baja', { exact: true })).toBeVisible()
    await expect(fila.getByText('Pasando sus leads…')).toBeVisible()
    await capturar(page, info, 'equipo-baja-02-en-curso')
  } finally {
    await lead.soltar()
  }

  // Suelto el lead, el job la termina y la lista deja de decirlo.
  sql('select public.equipo_bajas_continuar()')
  const fila = page.locator('tr, article').filter({ hasText: INVITADA })
  await page.reload()
  await page.getByLabel('Estado').selectOption('baja')
  await expect(fila.getByText('Dada de baja', { exact: true })).toBeVisible()
  await expect(fila.getByText('Pasando sus leads…')).toHaveCount(0)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('el guardián no deja al equipo sin quien lo administre, y lo dice en claro', async ({
  page,
}) => {
  // El guardián protege a la última persona que administra: con la dueña real en la base, la de
  // prueba no lo es. Corre siempre en `test:e2e:completo` y en CI; un spec suelto sobre una base
  // con cuentas lo salta con un aviso.
  const impide = await hayEquipoQueImpide()
  test.skip(impide.saltar, impide.motivo)
  await entrar(page, duena)
  await page.goto('/configuracion/equipo')

  // La dueña es la única que administra: no puede quitarse el rol.
  await page.getByRole('button', { name: `Más acciones de ${DUENA}` }).click()
  await page.getByRole('menuitem', { name: 'Cambiar sus roles' }).click()
  const suRol = page.getByRole('switch', { name: `Dueño para ${DUENA}` })
  await suRol.click()
  await expect(
    page.getByText('Siempre tiene que quedar alguien activo que gestione los roles'),
  ).toBeVisible()
  await expect(suRol).toBeChecked()
  expect(await rolesDe(duena)).toEqual(['dueno'])
})

// 5a-13: bajo 768 px la matriz muestra un rol a la vista y «Rol a la vista» (un <select>, `?rol=`) elige cuál; desde 768 px están todas las
// columnas y el selector no se dibuja. El rol B no tiene ningún permiso: lo que se ve de B es «No» y un interruptor sin marcar, nunca lo de A.
test('«Rol a la vista»: en el celular cada rol muestra sus permisos, y en escritorio están todos', async ({
  page,
}, info) => {
  const proyecto = info.project.name
  const a = `${PREFIJO_ROL_E2E}Vista A ${proyecto}`
  const b = `${PREFIJO_ROL_E2E}Vista B ${proyecto}`
  sql(`
    with rol_a as (
      insert into public.roles (nombre, clave) values (${literal(a)}, ${literal(`e2e_vista_a_${proyecto}`)}) returning id
    ), rol_b as (
      insert into public.roles (nombre, clave) values (${literal(b)}, ${literal(`e2e_vista_b_${proyecto}`)}) returning id
    )
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
      select id, 'agenda.tareas.recibir', null, 'todos' from rol_a;
  `)
  await entrar(page, duena)
  await page.goto('/configuracion/roles')
  await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()
  const tareas = (rolNombre: string) =>
    page.getByRole('switch', { name: `Recibir tareas para ${rolNombre}` })
  const vehiculos = (rolNombre: string) =>
    page.getByRole('button', { name: `Ver vehículos para ${rolNombre}: No. Cambiar` })
  const selector = page.getByLabel('Rol a la vista')

  if (!esMovil(page)) {
    await expect(selector).toBeHidden()
    await expect(tareas(a)).toBeChecked()
    await expect(tareas(b)).not.toBeChecked()
    return
  }

  await selector.selectOption({ label: a })
  await expect(page).toHaveURL(/[?&]rol=/)
  await expect(tareas(a)).toBeChecked()
  await expect(tareas(b)).toHaveCount(0)
  await expect(tareas('Dueño')).toHaveCount(0)
  await tareas(a).scrollIntoViewIfNeeded()
  await capturar(page, info, 'rol-a-la-vista-a')

  await selector.selectOption({ label: b })
  const valorDeB = await selector.inputValue()
  await expect(tareas(b)).not.toBeChecked()
  await expect(vehiculos(b)).toBeVisible()
  await expect(tareas(a)).toHaveCount(0)
  await tareas(b).scrollIntoViewIfNeeded()
  await capturar(page, info, 'rol-a-la-vista-b')

  // El rol a la vista vive en la URL: recargar no vuelve al primero.
  await page.reload()
  await expect(selector).toHaveValue(valorDeB)
  await expect(tareas(b)).toBeVisible()
  await expect(tareas(a)).toHaveCount(0)
})

// 5a-16: al 200 % del texto en el celular (412 px) el nombre de cada permiso y su control caben a la vez en el ancho de la página, sin
// desplazar la tarjeta: la matriz es una lista de un rol (la tabla pedía 465–564 px para el interruptor). En escritorio, la tabla: el
// control del primer rol también está a la vista. Un rol de nombre largo no lo empuja. `sinScrollHorizontal()` no lo ve (lo que un
// contenedor recorta no ensancha la página): `aLaVistaSinDesplazar()` sí. Capturas: `E2E_CAPTURAS=…`.
test('«Rol a la vista» al 200 %: el nombre y el control de cada permiso caben a la vez, con un rol de nombre largo', async ({
  page,
}, info) => {
  const proyecto = info.project.name
  const largo = `${PREFIJO_ROL_E2E}Supervisión de importaciones y de logística de toda la región ${proyecto}`
  sql(`
    insert into public.roles (nombre, clave) values (${literal(largo)}, ${literal(`e2e_largo_${proyecto}`)});
  `)
  await entrar(page, duena)
  await page.goto('/configuracion/roles')
  await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()
  if (esMovil(page)) {
    await page.getByLabel('Rol a la vista').selectOption({ label: largo })
  }
  const filas = page.locator('[data-permiso]')
  const turnos = page.locator('[data-permiso="web.cola.participar"]')
  await turnos.scrollIntoViewIfNeeded()
  await capturar(page, info, 'matriz-turnos-100')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await turnos.scrollIntoViewIfNeeded()
  await capturar(page, info, 'matriz-turnos-200')
  await sinScrollHorizontal(page)
  const cuantas = await filas.count()
  expect(cuantas).toBeGreaterThan(12)
  for (const indice of [...Array.from({ length: 12 }, (_, i) => i), cuantas - 1]) {
    const fila = filas.nth(indice)
    await fila.scrollIntoViewIfNeeded()
    const clave = (await fila.getAttribute('data-permiso')) ?? String(indice)
    await aLaVistaSinDesplazar(fila.locator('[data-nombre-de-permiso]'), `el nombre de ${clave}`)
    const control = fila
      .getByRole('switch')
      .or(fila.getByRole('button', { name: /Cambiar$/ }))
      .first()
    await aLaVistaSinDesplazar(control, `el control de ${clave}`)
  }
  // El encabezado del rol (su nombre, cortado con «…», y «Eliminar») también está a la vista. En escritorio ese botón está en la columna del
  // rol, al final de una tabla que se desplaza por diseño.
  if (esMovil(page)) {
    await aLaVistaSinDesplazar(
      page.getByRole('button', {
        name: new RegExp(`^Eliminar el rol ${PREFIJO_ROL_E2E}Supervisión`),
      }),
      'el botón de eliminar el rol largo',
    )
  }
})
