import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { masAccionesDe, menuDe, nombreDeLaFila } from './soporte/lista-de-catalogo'
import {
  PREFIJO_DE_ORIGEN_E2E,
  abrirOrigenes,
  borrarOrigenesDePrueba,
  sembrarOrigen,
} from './soporte/origenes-de-lead'
import {
  PREFIJO_DE_TIPO_E2E,
  abrirTipos,
  borrarTiposDePrueba,
  sembrarTipo,
} from './soporte/tipos-de-lead'
import {
  PREFIJO_DE_TIPO_DE_SEGUIMIENTO_E2E,
  abrirTiposDeSeguimiento,
  borrarTiposDeSeguimientoDePrueba,
  sembrarTipoDeSeguimiento,
} from './soporte/tipos-de-seguimiento'
import { abrirRecargarYVolver } from './soporte/vuelta-del-foco'

// La vuelta del foco en Configuración › Leads (4-49, paso 4.14-2a6): tras recargar con el modal de un origen, un tipo o un tipo de seguimiento
// abierto, «atrás» lo cierra y el foco vuelve a quien lo abrió (el «⋯» si fue desde su menú). La sonda del paso midió que, sin la vuelta, el foco
// quedaba en `body` en los 9 casos. El clic en la fila fuera del nombre abre con el foco en `body` y no marca: queda fuera (docs/DECISIONES.md).
let duena = ''
let proyecto = ''

type Seccion = {
  titulo: string
  ir: (page: Page) => Promise<void>
  nuevo: string
  editar: string
  // El botón «Nuevo …» del encabezado.
  botonNuevo: string
  nombre: () => string
  // La clave del id en la URL de la edición.
  clave: string
}

const SECCIONES: Seccion[] = [
  {
    titulo: 'Orígenes',
    ir: abrirOrigenes,
    nuevo: 'Nuevo origen',
    editar: 'Editar origen',
    botonNuevo: 'Nuevo origen',
    nombre: () => `${PREFIJO_DE_ORIGEN_E2E} vuelta ${proyecto}`,
    clave: 'origen',
  },
  {
    titulo: 'Tipos',
    ir: abrirTipos,
    nuevo: 'Nuevo tipo',
    editar: 'Editar tipo',
    botonNuevo: 'Nuevo tipo',
    nombre: () => `${PREFIJO_DE_TIPO_E2E} vuelta ${proyecto}`,
    clave: 'tipo',
  },
  {
    titulo: 'Tipos de seguimiento',
    ir: abrirTiposDeSeguimiento,
    nuevo: 'Nuevo tipo de seguimiento',
    editar: 'Editar tipo de seguimiento',
    botonNuevo: 'Nuevo tipo',
    nombre: () => `${PREFIJO_DE_TIPO_DE_SEGUIMIENTO_E2E} vuelta ${proyecto}`,
    clave: 'tipo-de-seguimiento',
  },
]

async function borrarTodo() {
  await borrarOrigenesDePrueba()
  await borrarTiposDePrueba()
  await borrarTiposDeSeguimientoDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarTodo()
  duena = correoDePrueba(`duena-vuelta-config-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Vuelta' })
  const [origen, tipo, seguimiento] = SECCIONES.map((s) => s.nombre())
  await sembrarOrigen(origen ?? '')
  await sembrarTipo(tipo ?? '')
  await sembrarTipoDeSeguimiento(seguimiento ?? '')
})

test.afterAll(async () => {
  await borrarTodo()
})

// Pulsa hasta que el modal esté (la página hidrata antes de que el clic valga).
const hastaAbrir = (dialogo: Locator, pulsar: () => Promise<void>) => async () => {
  await expect(async () => {
    await pulsar()
    await expect(dialogo).toBeVisible({ timeout: 1000 })
  }).toPass()
}

// «Editar» desde el «⋯» de la fila (si el menú ya está abierto, no se vuelve a pulsar).
const editarDesdeElMenu = (page: Page, nombre: string) => async () => {
  if (!(await menuDe(page, nombre).isVisible())) await masAccionesDe(page, nombre).click()
  await menuDe(page, nombre).getByRole('menuitem', { name: 'Editar', exact: true }).click()
}

type Caso = {
  titulo: string
  dialogo: (page: Page, s: Seccion) => Locator
  boton: (page: Page, s: Seccion) => Locator
  pulsar?: (page: Page, s: Seccion) => () => Promise<void>
  // La clave del id que también sale de la URL al volver.
  conId: boolean
}

const CASOS: Caso[] = [
  {
    titulo: '«Nuevo» del encabezado',
    dialogo: (page, s) => page.getByRole('dialog', { name: s.nuevo }),
    boton: (page, s) => page.getByRole('button', { name: s.botonNuevo, exact: true }).first(),
    conId: false,
  },
  {
    titulo: '«Editar» desde el «⋯» de la fila',
    dialogo: (page, s) => page.getByRole('dialog', { name: s.editar }),
    boton: (page, s) => masAccionesDe(page, s.nombre()),
    pulsar: (page, s) => editarDesdeElMenu(page, s.nombre()),
    conId: true,
  },
  {
    titulo: 'el nombre de la fila',
    dialogo: (page, s) => page.getByRole('dialog', { name: s.editar }),
    boton: (page, s) => nombreDeLaFila(page, s.nombre()),
    conId: true,
  },
]

for (const s of SECCIONES) {
  for (const caso of CASOS) {
    test(`${s.titulo}, ${caso.titulo}: abrir, recargar y «atrás» devuelve el foco a quien lo abrió`, async ({
      page,
    }) => {
      await entrar(page, duena, { fresco: true })
      await s.ir(page)
      const dialogo = caso.dialogo(page, s)
      const boton = caso.boton(page, s)
      await abrirRecargarYVolver(page, {
        boton,
        dialogo,
        abrir: hastaAbrir(dialogo, caso.pulsar ? caso.pulsar(page, s) : () => boton.click()),
      })
      if (caso.conId) expect(new URL(page.url()).searchParams.get(s.clave)).toBeNull()
    })
  }
}

// Sin recargar, «atrás» ya devolvía el foco al «⋯» (Base UI) y la vuelta no lo cambia: guardia sin caída demostrable (docs/DECISIONES.md).
test('Orígenes, «Editar» desde el «⋯»: sin recargar, «atrás» devuelve el foco al «⋯»', async ({
  page,
}) => {
  const s = SECCIONES[0]
  if (!s) throw new Error('Falta la sección de orígenes')
  await entrar(page, duena, { fresco: true })
  await s.ir(page)
  const dialogo = page.getByRole('dialog', { name: s.editar })
  await hastaAbrir(dialogo, editarDesdeElMenu(page, s.nombre()))()
  await page.goBack()
  await expect(dialogo).toBeHidden()
  expect(new URL(page.url()).searchParams.get('panel')).toBeNull()
  await expect(masAccionesDe(page, s.nombre())).toBeFocused()
})
