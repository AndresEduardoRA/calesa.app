import { gzipSync } from 'node:zlib'
import { expect, test, type Locator, type Page } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarPersonasSembradas,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  sembrarPersonas,
} from './soporte/base'
import { ingresar } from './soporte/pasos'
import { capturar, sinScrollHorizontal, textoGrandeAlCargar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// 5a-21: la lista del equipo tiene tope. Con 1.050 personas la página dibuja las 100 primeras por nombre y lo dice
// («Mostrando las 100 primeras por nombre.», con el camino a las demás); el buscador y el filtro de estado se resuelven en el servidor,
// así que la persona 1.001 se encuentra buscándola, con o sin tildes; `?persona=` y `?baja=` leen a su persona por id aunque no esté en la
// página. Antes la lista leía `perfiles` entera: `max_rows` = 1.000 la cortaba en silencio y el buscador, que filtraba en el cliente, no
// alcanzaba a la 1.001. Una prueba por caso y sin `serial`: cuando una cae, las demás siguen.

const CLAVE = 'una-clave-de-prueba-9'
const PREFIJO = 'Tope'
const SEMBRADAS = 1050
const TOPE = 100
const AVISO = 'Mostrando las 100 primeras por nombre.'
const CAMINO = 'Busca por nombre o correo, o filtra por estado.'
const ULTIMA = 'Zoé Ñúñez Tope'
const COMODINES = String.raw`Cincuenta 50% desc_uento \ d"q 'x`
const DE_BAJA = 'Baja De Tope'
const BOTON_DE_PERSONA = /^(Acciones sobre|Más acciones de) /

// Los nodos del DOM de una lista de 100 personas: el mismo presupuesto que la lista de 100 leads (`docs/RENDIMIENTO.md`).
const PRESUPUESTO_DE_NODOS = 3500

let duena = ''
let sinPermiso = ''
let idUltima = ''
let idDeBaja = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-tope-${proyecto}`)
  sinPermiso = correoDePrueba(`sin-permiso-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Tope' })
  sembrarPersonas(SEMBRADAS, PREFIJO)
  // Las que no se siembran en serie: tres con el mismo nombre que la 99 (el corte del tope cae entre nombres repetidos), la que ordena
  // después de la 1.000 (y se busca sin tildes), la de los comodines y las comillas, la dada de baja y la que no puede ver el equipo.
  for (const [n, nombre] of [
    ['a', `${PREFIJO} 00099`],
    ['b', `${PREFIJO} 00099`],
    ['c', `${PREFIJO} 00099`],
    ['zoe', ULTIMA],
    ['comodines', COMODINES],
    ['baja', DE_BAJA],
    ['sin-permiso', 'Sin Permiso Tope'],
  ] as const) {
    await crearPersona({
      email: n === 'sin-permiso' ? sinPermiso : correoDePrueba(`${n}-tope-${proyecto}`),
      contrasena: CLAVE,
      nombre,
      invitada: true,
    })
  }
  sql(
    `update public.perfiles set invitacion_aceptada_en = now() where email = ${literal(sinPermiso)};`,
  )
  sql(`update public.perfiles set activo = false where nombre = ${literal(DE_BAJA)};`)
  idUltima = sql(`select id from public.perfiles where nombre = ${literal(ULTIMA)};`)
  idDeBaja = sql(`select id from public.perfiles where nombre = ${literal(DE_BAJA)};`)
})

test.afterAll(async () => {
  borrarPersonasSembradas(PREFIJO)
  await borrarPersonasDePrueba()
})

async function entrar(page: Page, correo: string) {
  await page.goto('/ingreso')
  await ingresar(page, correo, CLAVE)
  await expect(page).toHaveURL('/')
}

const botones = (page: Page): Locator => page.getByRole('button', { name: BOTON_DE_PERSONA })

async function ir(page: Page, parametros: Record<string, string> = {}) {
  const url = new URLSearchParams(parametros).toString()
  return page.goto(`/configuracion/equipo${url ? `?${url}` : ''}`)
}

// Los nombres de las personas que dibuja la lista, en su orden (el nombre sale del «⋯» de cada una).
async function nombresVisibles(page: Page): Promise<string[]> {
  const nombres = await botones(page).evaluateAll((lista) =>
    lista.map((boton) => boton.getAttribute('aria-label') ?? ''),
  )
  return nombres.map((nombre) => nombre.replace(BOTON_DE_PERSONA, ''))
}

// Lo que dice la base: las primeras vigentes por nombre, en el orden de la lista (nombre, correo, id).
function primerasVigentes(cuantas: number): string[] {
  return sql(
    `select nombre from public.perfiles where activo order by nombre, email, id limit ${String(cuantas)};`,
  ).split('\n')
}

test('con 1.050 personas la lista dibuja las 100 primeras por nombre y lo dice', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await ir(page)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(AVISO, { exact: false })).toBeVisible()
  await expect(page.getByText(CAMINO)).toBeVisible()
  expect(await botones(page).count(), 'una fila con su «⋯» por cada una de las 100').toBe(TOPE)
  expect(
    await nombresVisibles(page),
    'las primeras por nombre, con el desempate de la base',
  ).toEqual(primerasVigentes(TOPE))
  await capturar(page, info, 'lista-con-tope')
})

test('la persona 1.001 se encuentra buscándola, también sin tildes', async ({ page }) => {
  await entrar(page, duena)
  for (const q of [ULTIMA, 'zoe nunez', 'ZOÉ ÑÚÑEZ', 'nuñez tope']) {
    await ir(page, { q })
    await expect(page.getByText(ULTIMA, { exact: true }).first(), `«${q}»`).toBeVisible()
    expect(await botones(page).count(), `«${q}»: sólo ella`).toBe(1)
    await expect(page.getByText(AVISO), `«${q}»: cabe, sin aviso`).toHaveCount(0)
  }
})

test('escribir en el buscador la trae del servidor', async ({ page }) => {
  await entrar(page, duena)
  await ir(page)
  await expect(botones(page).first()).toBeVisible()
  await page.getByLabel('Buscar por nombre o correo').fill('zoe nunez')
  await expect(page.getByText(ULTIMA, { exact: true }).first()).toBeVisible()
  expect(await botones(page).count()).toBe(1)
})

test('los comodines y las comillas se buscan como son', async ({ page }) => {
  await entrar(page, duena)
  // Con un tramo de 3 letras o dígitos (5a-31): un comodín, una barra o una comilla sueltos no filtran (`equipo-busqueda-minima`).
  for (const q of [
    '50% desc_uento',
    '50% desc',
    'desc_uento \\',
    'uento \\ d"q',
    `uento \\ d"q 'x`,
  ]) {
    await ir(page, { q })
    await expect(page.getByText(COMODINES, { exact: true }).first(), `«${q}»`).toBeVisible()
    expect(await nombresVisibles(page), `«${q}»: sólo la de los comodines`).toEqual([COMODINES])
  }
  // `_` es un comodín de `ilike` (un carácter) y `%` también (cualquiera): escritos tal cual no encuentran a «Tope 00001».
  await ir(page, { q: 'Tope_00001' })
  await expect(page.getByText('Nada coincide con los filtros')).toBeVisible()
  await ir(page, { q: 'To%00001' })
  await expect(page.getByText('Nada coincide con los filtros')).toBeVisible()
})

test('una búsqueda sin resultados lo dice, sin aviso de tope', async ({ page }) => {
  await entrar(page, duena)
  await ir(page, { q: 'zzzzqqqq' })
  await expect(page.getByText('Nada coincide con los filtros')).toBeVisible()
  expect(await botones(page).count()).toBe(0)
  await expect(page.getByText(AVISO)).toHaveCount(0)
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(page.getByText(AVISO)).toBeVisible()
})

test('un estado que no existe vuelve a «En el equipo»', async ({ page }) => {
  await entrar(page, duena)
  await ir(page, { estado: 'xyz' })
  await expect(page.getByLabel('Estado')).toHaveValue('vigentes')
  await expect(page.getByText(AVISO)).toBeVisible()
  expect(await botones(page).count()).toBe(TOPE)
  expect(await nombresVisibles(page)).toEqual(primerasVigentes(TOPE))
})

test('el filtro de estado se resuelve en el servidor', async ({ page }) => {
  await entrar(page, duena)
  await ir(page, { estado: 'baja' })
  await expect(page.getByText(DE_BAJA, { exact: true }).first()).toBeVisible()
  await expect(page.getByText(ULTIMA, { exact: true })).toHaveCount(0)
  await expect(page.getByText(AVISO)).toHaveCount(0)
  // Las 1.050 sembradas (y varias más) tienen la invitación pendiente: son más que el tope y lo dice.
  await ir(page, { estado: 'invitacion_pendiente' })
  await expect(page.getByText(AVISO)).toBeVisible()
  await expect(page.getByText('Dalia Tope', { exact: true })).toHaveCount(0)
  // Estado y texto a la vez.
  await ir(page, { estado: 'invitacion_pendiente', q: 'zoe' })
  await expect(page.getByText(ULTIMA, { exact: true }).first()).toBeVisible()
  await ir(page, { estado: 'activa', q: 'zoe' })
  await expect(page.getByText('Nada coincide con los filtros')).toBeVisible()
})

test('?baja= y ?persona= leen a su persona por id aunque no esté en la página', async ({
  page,
}) => {
  await entrar(page, duena)
  await ir(page, { baja: idUltima })
  await expect(page.getByText(`Dar de baja a ${ULTIMA}`).first()).toBeVisible()
  await expect(page.getByText('No tiene leads a su cargo.')).toBeVisible()
  await ir(page, { persona: idUltima })
  await expect(page.getByText(`Roles de ${ULTIMA}`).first()).toBeVisible()
  // Una persona dada de baja no se da de baja otra vez.
  await ir(page, { baja: idDeBaja })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/^Dar de baja a /)).toHaveCount(0)
})

test('quien no puede ver el equipo no ve a nadie', async ({ page }) => {
  await entrar(page, sinPermiso)
  await ir(page)
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  expect(await botones(page).count()).toBe(0)
  await expect(page.getByText(ULTIMA, { exact: true })).toHaveCount(0)
})

test('los nodos y los bytes de la lista de 100 no dependen de cuántas personas hay', async ({
  page,
}, info) => {
  await entrar(page, duena)
  const respuesta = await ir(page)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(botones(page).first()).toBeVisible()
  const cuerpo = (await respuesta?.body()) ?? Buffer.alloc(0)
  const nodos = await page.evaluate(() => document.querySelectorAll('*').length)
  const filas = await botones(page).count()
  const medida = `filas ${String(filas)}, nodos ${String(nodos)}, documento ${String(cuerpo.length)} B (${String(gzipSync(cuerpo).length)} B gz)`
  info.annotations.push({ type: 'lista del equipo', description: medida })
  process.stdout.write(`medicion|equipo-lista|${info.project.name}|${medida}\n`)
  expect(filas).toBeLessThanOrEqual(TOPE)
  expect(nodos).toBeLessThan(PRESUPUESTO_DE_NODOS)
})

test('al 200 %: la lista con tope y su aviso caben sin desplazar la página', async ({
  page,
}, info) => {
  await textoGrandeAlCargar(page)
  await entrar(page, duena)
  await ir(page)
  await expect(page.getByText(AVISO)).toBeVisible()
  await sinScrollHorizontal(page)
  await page.getByText(AVISO).scrollIntoViewIfNeeded()
  await capturar(page, info, 'lista-con-tope-200')
})
