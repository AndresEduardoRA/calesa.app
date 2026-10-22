import { expect, test, type Locator, type Page } from './soporte/prueba'
import {
  DOMINIO_E2E,
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { esMovil } from './soporte/inventario'
import { ingresar } from './soporte/pasos'
import {
  aLaVistaSinDesplazar,
  quieto,
  sinScrollHorizontal,
  sinTextoCortado,
  textoGrandeAlCargar,
} from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// La lista del equipo y la matriz de Roles con el texto al 200 % (5a-17 y 5a-19): el nombre y el «⋯» de cada persona caben a la vez sin
// desplazar nada, aun con un nombre de 70 letras, un correo de 56 y ocho roles de nombre largo; el menú abierto cabe en la pantalla; una
// lista vacía por filtro y una persona que sólo puede ver también caben; y la columna «Permiso» de la matriz de escritorio no se va al
// desplazarla de costado. Una prueba por caso y sin `serial`: cuando una cae, las demás siguen.

const CLAVE = 'una-clave-de-prueba-9'
const NOMBRE_LARGO = 'Maria de los Angeles Fernandez de Cordoba y Sanchez de la Vega Montenegro'
const ROLES_LARGOS = 8
const BOTON_DE_PERSONA = /^(Acciones sobre|Más acciones de) /

// Un correo de 38 letras: lo bastante largo para que no quepa en 16 rem (5a-17 lo cortaba al 100 % en escritorio).
const CORREO_DE_38 = `${'c'.repeat(17)}@${DOMINIO_E2E}`

let duena = ''
let soloVer = ''
let larga = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-equipo-200-${proyecto}`)
  soloVer = correoDePrueba(`solo-ver-${proyecto}`)
  larga = correoDePrueba(`persona-con-un-correo-muy-largo-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Equipo' })
  await crearPersona({ email: larga, contrasena: CLAVE, nombre: NOMBRE_LARGO, invitada: true })
  await crearPersona({ email: soloVer, contrasena: CLAVE, nombre: 'Sol Ver', invitada: true })
  await crearPersona({
    email: CORREO_DE_38,
    contrasena: CLAVE,
    nombre: 'Treinta y Ocho',
    invitada: true,
  })
  await darRolDePrueba({
    email: soloVer,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Sólo ver el equipo ${proyecto}`,
      clave: `e2e_solo_ver_${proyecto}`,
    },
    permisos: ['equipo.usuarios.ver'],
  })
  sql(
    `update public.perfiles set invitacion_aceptada_en = now() where email = ${literal(soloVer)};`,
  )
  // Ocho roles de nombre largo, todos de la persona de nombre largo: sus insignias y las columnas de la matriz.
  for (let n = 1; n <= ROLES_LARGOS; n++) {
    sql(`
      insert into public.roles (nombre, clave)
        values (${literal(`${PREFIJO_ROL_E2E}Supervisión ${String(n)} de importaciones y logística ${proyecto}`)}, ${literal(`e2e_largo_${String(n)}_${proyecto}`)});
      insert into public.usuarios_roles (usuario_id, rol_id, es_principal)
        select p.id, r.id, false from public.perfiles p, public.roles r
        where p.email = ${literal(larga)} and r.clave = ${literal(`e2e_largo_${String(n)}_${proyecto}`)};
    `)
  }
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

const botones = (page: Page): Locator => page.getByRole('button', { name: BOTON_DE_PERSONA })

// La columna «Persona» crece con el espacio libre de la tabla (hasta 26 rem) en vez de fijarse en 16: al 100 % un correo de 38 letras se ve
// entero. Al 200 % conserva sus 16 rem (lo que sobra es menos), y la prueba de abajo sigue pidiendo el nombre a 100 px y el «⋯» a la vista.
test('al 100 %: un correo de 38 letras se ve entero', async ({ page }) => {
  await entrar(page, duena)
  await page.goto('/configuracion/equipo')
  const correo = page.getByText(CORREO_DE_38, { exact: true }).first()
  await expect(correo).toBeVisible()
  await sinTextoCortado(correo)
  await expect(correo).toHaveAttribute('title', CORREO_DE_38)
})

test('al 200 %: el nombre y el «⋯» de cada persona caben a la vez, con nombre, correo y roles largos', async ({
  page,
}) => {
  await textoGrandeAlCargar(page)
  await entrar(page, duena)
  await page.goto('/configuracion/equipo')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(NOMBRE_LARGO).first()).toBeVisible()
  await sinScrollHorizontal(page)
  // La dueña, la de nombre largo y la que sólo ve: tres filas, y un «⋯» en cada una de las que se pueden gestionar.
  const total = await botones(page).count()
  expect(total, 'hay un «⋯» por persona que se puede gestionar').toBeGreaterThanOrEqual(2)
  for (let n = 0; n < total; n++) {
    await botones(page).nth(n).scrollIntoViewIfNeeded()
    await aLaVistaSinDesplazar(botones(page).nth(n), `el «⋯» de la fila ${String(n + 1)}`)
  }
  const nombre = page.getByText(NOMBRE_LARGO, { exact: true }).first()
  await nombre.scrollIntoViewIfNeeded()
  await aLaVistaSinDesplazar(nombre, 'el nombre largo')
  // El nombre no se achica hasta no leerse (antes: 44 px en escritorio): conserva lo que le toca de la fila.
  const caja = await nombre.boundingBox()
  expect(caja?.width ?? 0, 'el nombre largo se achicó hasta casi no verse').toBeGreaterThanOrEqual(
    100,
  )
  // Los ocho roles de nombre largo están a la vista, sin que ninguno ensanche nada.
  for (let n = 1; n <= ROLES_LARGOS; n++) {
    const rol = page.getByText(new RegExp(`Supervisión ${String(n)} de importaciones`)).first()
    await rol.scrollIntoViewIfNeeded()
    await aLaVistaSinDesplazar(rol, `el rol ${String(n)} de la persona de nombre largo`)
  }
})

test('al 200 %: el menú abierto de una persona cabe en la pantalla', async ({ page }) => {
  await textoGrandeAlCargar(page)
  await entrar(page, duena)
  await page.goto('/configuracion/equipo')
  await expect(page.getByText(NOMBRE_LARGO).first()).toBeVisible()
  const total = await botones(page).count()
  for (let n = 0; n < total; n++) {
    await botones(page).nth(n).scrollIntoViewIfNeeded()
    await botones(page).nth(n).click()
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await quieto(menu)
    await aLaVistaSinDesplazar(menu, `el menú de la fila ${String(n + 1)}`)
    const { ancho, pantalla } = await menu.evaluate((m) => ({
      ancho: m.getBoundingClientRect().width,
      pantalla: document.documentElement.clientWidth,
    }))
    expect(
      ancho,
      `el menú de la fila ${String(n + 1)} es más ancho que la pantalla`,
    ).toBeLessThanOrEqual(pantalla)
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
  }
})

test('al 200 %: una lista vacía por filtro cabe y ofrece limpiar', async ({ page }) => {
  await textoGrandeAlCargar(page)
  await entrar(page, duena)
  await page.goto('/configuracion/equipo?q=zzzz-nadie-se-llama-asi')
  await expect(page.getByText('Nada coincide con los filtros')).toBeVisible()
  await sinScrollHorizontal(page)
  await aLaVistaSinDesplazar(
    page.getByRole('button', { name: 'Limpiar filtros' }),
    'Limpiar filtros',
  )
  await expect(botones(page)).toHaveCount(0)
})

test('al 200 %: quien sólo puede ver el equipo no tiene «⋯» y la lista cabe', async ({ page }) => {
  await textoGrandeAlCargar(page)
  await entrar(page, soloVer)
  await page.goto('/configuracion/equipo')
  await expect(page.getByText(NOMBRE_LARGO).first()).toBeVisible()
  await expect(botones(page)).toHaveCount(0)
  await sinScrollHorizontal(page)
  const nombre = page.getByText(NOMBRE_LARGO, { exact: true }).first()
  await aLaVistaSinDesplazar(nombre, 'el nombre largo')
  const caja = await nombre.boundingBox()
  expect(caja?.width ?? 0, 'el nombre largo se achicó hasta casi no verse').toBeGreaterThanOrEqual(
    100,
  )
})

// 5a-19: con ocho roles de nombre largo la tabla mide miles de píxeles y se desplaza dentro de su tarjeta: con la tabla desplazada hasta el
// final, el nombre de cada permiso sigue a la vista (la columna «Permiso» pegada a la izquierda). Sólo escritorio: por debajo de 768 px la
// matriz es la lista de un rol a la vez (5a-16), que no tiene columnas.
test('al 200 %: con ocho roles, la columna «Permiso» sigue a la vista al desplazar la matriz', async ({
  page,
}) => {
  test.skip(esMovil(page), 'por debajo de 768 px la matriz es una lista de un rol a la vez')
  await textoGrandeAlCargar(page)
  await entrar(page, duena)
  await page.goto('/configuracion/roles')
  await expect(page.getByRole('heading', { name: 'Roles y permisos' })).toBeVisible()
  const filas = page.locator('[data-permiso]')
  const cuantas = await filas.count()
  expect(cuantas).toBeGreaterThan(12)
  const ancho = await page.evaluate(() => {
    let mayor = 0
    for (const e of document.querySelectorAll<HTMLElement>('*')) {
      if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'auto') {
        mayor = Math.max(mayor, e.scrollWidth)
        e.scrollLeft = e.scrollWidth
      }
    }
    return mayor
  })
  expect(
    ancho,
    'la tabla tiene que ser más ancha que su tarjeta para que valga la prueba',
  ).toBeGreaterThan(1500)
  await sinScrollHorizontal(page)
  for (const indice of [...Array.from({ length: 12 }, (_, i) => i), cuantas - 1]) {
    const fila = filas.nth(indice)
    await fila.scrollIntoViewIfNeeded()
    const clave = (await fila.getAttribute('data-permiso')) ?? String(indice)
    await aLaVistaSinDesplazar(fila.locator('[data-nombre-de-permiso]'), `el nombre de ${clave}`)
  }
})
