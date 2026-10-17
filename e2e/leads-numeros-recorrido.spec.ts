import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { exigir } from './soporte/leads'
import { irAFicha } from './soporte/leads-ficha'
import { delLead, fila, irALeads } from './soporte/leads-listado'
import {
  capturar,
  csvDe,
  dentroDeLaPantalla,
  limpiarRecorrido,
  prepararRecorrido,
  quieto,
  sinScrollHorizontal,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'
import { formatearNumero } from '../src/shared/lib/formato'

// Los dos números de un lead (9f-2) con dos cuentas: la dueña, que tiene `leads.numero_global.ver`, y Ana, la
// asesora de la semilla, que no. El global llega sólo a quien tiene el permiso: lo decide la base, y acá se mira
// que no esté ni en lo que se dibuja ni en el HTML que llega. Los números se fijan en las copias que lee la
// interfaz con 7 y 6 dígitos para ver cómo caben en el celular. Capturas: `E2E_CAPTURAS=e2e-capturas/9f-2`.
test.describe.configure({ mode: 'serial' })

const GLOBAL = 7_654_321
const PROPIO = 123_456
const escrito = (n: number) => formatearNumero(n, { decimales: 0 })
const PERMISO = 'leads.numero_global.ver'

let r: TerrenoDelRecorrido
let proyecto = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  r = await prepararRecorrido(proyecto, 'Numeros')
  await admin().from('leads_numeros_globales').update({ numero: GLOBAL }).eq('lead_id', r.uno.id)
  await admin().from('leads_numeros_propios').update({ numero: PROPIO }).eq('lead_id', r.uno.id)
})

test.afterAll(async () => {
  await quitarElPermisoDelRol()
  await limpiarRecorrido(r)
})

const busqueda = (texto: string) => `?${new URLSearchParams({ q: texto }).toString()}`
// La dueña ve «míos» por defecto: lo de las demás es `alcance=todos`.
const todos = (consulta: string) => `${consulta}&alcance=todos`
const nombreCorto = () => `Numeros Uno ${proyecto}`

// El rol de Ana es el `asesor` de la semilla: el permiso se le da y se le quita al rol, y siempre se repone.
async function elRolDeAna(): Promise<string> {
  const { data: perfil, error: sinPerfil } = await admin()
    .from('perfiles')
    .select('id')
    .eq('email', r.ana.email)
    .single<{ id: string }>()
  exigir(sinPerfil, 'leer a Ana')
  const { data, error } = await admin()
    .from('usuarios_roles')
    .select('rol_id')
    .eq('usuario_id', perfil?.id ?? '')
    .limit(1)
    .single<{ rol_id: string }>()
  exigir(error, 'leer el rol de Ana')
  return data?.rol_id ?? ''
}
async function darElPermisoAlRol() {
  const { error } = await admin()
    .from('roles_permisos')
    .insert({ rol_id: await elRolDeAna(), permiso_clave: PERMISO, alcance: 'todos' })
  exigir(error, 'darle el permiso al rol')
}
async function quitarElPermisoDelRol() {
  const { error } = await admin()
    .from('roles_permisos')
    .delete()
    .eq('rol_id', await elRolDeAna())
    .eq('permiso_clave', PERMISO)
  exigir(error, 'quitarle el permiso al rol')
}

test('A · la dueña, con el permiso: el global y, aparte, el propio de quien lo creó, con su nombre', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  await irALeads(page, todos(busqueda(nombreCorto())))
  await expect(fila(page, nombreCorto())).toBeVisible()
  const lista = delLead(page, nombreCorto())
  // En la lista, el que va primero (el global); el otro, en la ficha y el drawer.
  await expect(lista.getByText(`N.º ${escrito(GLOBAL)}`)).toBeVisible()
  await expect(lista.getByText(`N.º ${escrito(PROPIO)}`)).toHaveCount(0)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-listado')

  // El drawer se abre con un clic en el nombre (con la URL directa, la lista de atrás queda inerte en el celular).
  await fila(page, nombreCorto()).click()
  const drawer = page.getByRole('dialog', { name: r.uno.nombre })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText(`N.º ${escrito(GLOBAL)}`)).toBeVisible()
  await expect(
    drawer.getByText(new RegExp(`N\\.º ${escrito(PROPIO)} · ${r.ana.nombre}`)),
  ).toBeVisible()
  await quieto(drawer)
  await dentroDeLaPantalla(page, drawer)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-drawer')

  await irAFicha(page, r.uno.id)
  await expect(page.getByText(`N.º ${escrito(GLOBAL)}`).first()).toBeVisible()
  await expect(
    page.getByText(new RegExp(`N\\.º ${escrito(PROPIO)} · ${r.ana.nombre}`)).first(),
  ).toBeVisible()
  await sinScrollHorizontal(page)
  // El título y las acciones no se montan (en el celular, con cuatro botones, se tapaban).
  const titulo = await page.getByRole('heading', { level: 1 }).boundingBox()
  const favorito = await page.getByRole('button', { name: 'Favorito' }).boundingBox()
  expect(titulo).not.toBeNull()
  expect(favorito).not.toBeNull()
  if (titulo && favorito) {
    const debajo = favorito.y >= titulo.y + titulo.height - 1
    const aLaDerecha = favorito.x >= titulo.x + titulo.width - 1
    expect(debajo || aLaDerecha).toBe(true)
  }
  await capturar(page, info, 'duena-ficha')

  // Buscar «#n» es buscar el que ve primero: el global.
  await irALeads(page, todos(busqueda(`#${String(GLOBAL)}`)))
  await expect(fila(page, nombreCorto())).toBeVisible()
  await irALeads(page, todos(busqueda(`#${String(PROPIO)}`)))
  await expect(fila(page, nombreCorto())).toHaveCount(0)
})

test('B · Ana, sin el permiso: sólo «Tu n.º»; el global no llega ni al HTML ni se encuentra', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irALeads(page, busqueda(nombreCorto()))
  const lista = delLead(page, nombreCorto())
  await expect(lista.getByText(`Tu n.º ${escrito(PROPIO)}`)).toBeVisible()
  await expect(page.getByText(escrito(GLOBAL))).toHaveCount(0)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'asesora-listado')

  await fila(page, nombreCorto()).click()
  const drawer = page.getByRole('dialog', { name: r.uno.nombre })
  await expect(drawer.getByText(`Tu n.º ${escrito(PROPIO)}`)).toBeVisible()
  await quieto(drawer)
  await dentroDeLaPantalla(page, drawer)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'asesora-drawer')

  await irAFicha(page, r.uno.id)
  await expect(page.getByText(`Tu n.º ${escrito(PROPIO)}`).first()).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'asesora-ficha')
  // Ni el texto ni el HTML que llegó (la RSC va adentro) llevan el global.
  expect(await page.content()).not.toContain(String(GLOBAL))

  // Busca el propio; el global de un lead que ve no se encuentra (sería un oráculo).
  await irALeads(page, busqueda(`#${String(PROPIO)}`))
  await expect(fila(page, nombreCorto())).toBeVisible()
  await irALeads(page, busqueda(`#${String(GLOBAL)}`))
  await expect(fila(page, nombreCorto())).toHaveCount(0)
})

test('C · conceder o quitar el permiso con la sesión abierta se ve al volver a cargar, sin nada en la caché', async ({
  page,
}) => {
  await entrar(page, r.ana.email)
  await irAFicha(page, r.uno.id)
  await expect(page.getByText(`Tu n.º ${escrito(PROPIO)}`).first()).toBeVisible()
  await expect(page.getByText(`N.º ${escrito(GLOBAL)}`)).toHaveCount(0)

  await darElPermisoAlRol()
  await page.reload()
  await expect(page.getByText(`N.º ${escrito(GLOBAL)}`).first()).toBeVisible()
  // Con el permiso, el propio pasa a ser el dato secundario.
  await expect(page.getByText(`Tu n.º ${escrito(PROPIO)}`).first()).toBeVisible()
  await irALeads(page, busqueda(`#${String(GLOBAL)}`))
  await expect(fila(page, nombreCorto())).toBeVisible()

  await quitarElPermisoDelRol()
  await irAFicha(page, r.uno.id)
  await expect(page.getByText(`N.º ${escrito(GLOBAL)}`)).toHaveCount(0)
  expect(await page.content()).not.toContain(String(GLOBAL))
  await irALeads(page, busqueda(`#${String(GLOBAL)}`))
  await expect(fila(page, nombreCorto())).toHaveCount(0)
})

test('D · importar un archivo con una columna de número: no se importa y lo dice', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  await page.goto('/leads/importar')
  await page.locator('input[type=file]').setInputFiles({
    name: 'con-numero.csv',
    mimeType: 'text/csv',
    buffer: csvDe(['N.º;Nombre;Teléfono', `5;E2E Numeros Archivo ${proyecto};79123457`], ';', true),
  })
  await expect(
    page.getByText('La columna «N.º» no se importa: el número de un lead lo pone el sistema.'),
  ).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'duena-importar-con-numero')
})
