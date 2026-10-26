import { expect, test, type Locator, type Page } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { ingresar } from './soporte/pasos'
import {
  aLaVistaAlAcomodarse,
  aLaVistaSinDesplazar,
  recibeElClic,
  sinScrollHorizontal,
  sinTextoCortado,
  textoGrandeAlCargar,
} from './soporte/recorrido'

// Configuración al 200 % del texto (5a-18 y c.1/c.2 de la sesión de defectos al 200 %): cada pantalla de Configuración, en el celular y en
// escritorio, no ensancha la página (`sinScrollHorizontal`), deja a la vista su título, su pestaña activa y lo que pone al borde derecho
// (`aLaVistaSinDesplazar`). El texto crece **antes** de cargar, como lo tiene quien lo configuró en su navegador: lo que se mide es lo
// que esa persona ve al entrar. Una prueba por pantalla y sin `serial`: cuando una cae, las demás siguen y dicen cuáles más fallan.

const CLAVE = 'una-clave-de-prueba-9'
const LARGO =
  'Subasta internacional de vehículos livianos y pesados de Norteamérica y del Asia oriental'

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  duena = correoDePrueba(`duena-200-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Doscientos' })
  origen = await crearOrigenDePrueba(LARGO, `largo_${info.project.name}`)
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
})

async function entrar(page: Page) {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
}

type Pantalla = {
  titulo: string
  url: () => string
  // Lo que se pega al borde derecho y tiene que verse sin desplazar nada, con cómo se llama en el mensaje.
  controles?: (page: Page) => [Locator, string][]
}

const DE_UN_ORIGEN = (seccion: string) => () =>
  `/configuracion/origenes/${origen.id}?seccion=${seccion}`

const PANTALLAS: Pantalla[] = [
  { titulo: 'el centro de Configuración', url: () => '/configuracion' },
  { titulo: 'Empresa › Empresa', url: () => '/configuracion/empresa?seccion=empresa' },
  {
    titulo: 'Empresa › Monedas',
    url: () => '/configuracion/empresa?seccion=monedas',
    controles: (page) => [
      [
        page
          .getByText(/^1 [A-Z]{3} = $/)
          .first()
          .locator('..'),
        'el tipo de cambio de la primera fila',
      ],
    ],
  },
  { titulo: 'Empresa › Integraciones', url: () => '/configuracion/empresa?seccion=integraciones' },
  { titulo: 'Orígenes', url: () => '/configuracion/origenes' },
  {
    titulo: 'la ficha de un origen › Datos',
    url: DE_UN_ORIGEN('datos'),
    controles: (page) => [
      [page.getByRole('link', { name: /^Abrir/ }).first(), 'el primer «Abrir»'],
    ],
  },
  { titulo: 'la ficha de un origen › Campos', url: DE_UN_ORIGEN('campos') },
  { titulo: 'la ficha de un origen › Categorías', url: DE_UN_ORIGEN('categorias') },
  { titulo: 'Leads › Campos', url: () => '/configuracion/leads?seccion=campos' },
  { titulo: 'Leads › Orígenes del lead', url: () => '/configuracion/leads?seccion=origenes' },
  { titulo: 'Leads › Tipos de lead', url: () => '/configuracion/leads?seccion=tipos' },
  {
    titulo: 'Leads › Tipos de seguimiento',
    url: () => '/configuracion/leads?seccion=seguimientos',
  },
  {
    titulo: 'Cotización › Niveles de acceso',
    url: () => '/configuracion/cotizacion?seccion=niveles',
    controles: (page) => [
      [page.getByRole('button', { name: /^Más acciones de / }).first(), 'el «⋯» del primer nivel'],
    ],
  },
  {
    titulo: 'Equipo',
    url: () => '/configuracion/equipo',
    controles: (page) => [
      [
        page.getByRole('button', { name: /^(Acciones sobre|Más acciones de) / }).first(),
        'el «⋯» de la primera persona',
      ],
    ],
  },
  { titulo: 'Roles', url: () => '/configuracion/roles' },
]

for (const pantalla of PANTALLAS) {
  test(`al 200 %: ${pantalla.titulo} no ensancha la página y deja a la vista lo suyo`, async ({
    page,
  }) => {
    await textoGrandeAlCargar(page)
    await entrar(page)
    await page.goto(pantalla.url())
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('200%')
    await sinScrollHorizontal(page)
    await aLaVistaSinDesplazar(page.getByRole('heading', { level: 1 }), 'el título')
    const activa = page.getByRole('tab', { selected: true })
    if ((await activa.count()) > 0) {
      // La barra se desplaza hasta la pestaña abierta recién al hidratar (CI-3).
      await aLaVistaAlAcomodarse(activa.first(), 'la pestaña activa')
    }
    for (const [lugar, que] of pantalla.controles?.(page) ?? []) {
      await aLaVistaSinDesplazar(lugar, que)
    }
  })
}

// Empresa › Monedas: con el texto al 200 % en 412 px la fila de un tipo de cambio no aprieta su nombre («O…») ni deja el valor encima de
// su insignia: el valor baja a otra línea cuando no cabe al lado. Se lee entero el nombre de cada tipo de cambio y de cada moneda.
test('al 200 %: en Monedas se leen enteros el nombre y el valor de cada tipo de cambio, sin solaparse', async ({
  page,
}) => {
  await textoGrandeAlCargar(page)
  await entrar(page)
  await page.goto('/configuracion/empresa?seccion=monedas')
  await expect(page.getByRole('heading', { name: 'Tipos de cambio' })).toBeVisible()
  const filas = page.getByRole('list').filter({ has: page.getByText(/^1 [A-Z]{3} = $/) })
  await sinTextoCortado(filas)
  await sinTextoCortado(page.getByRole('list').filter({ hasText: 'Dólar estadounidense' }))
  const cajas = await page.locator('li button').evaluateAll((botones) =>
    botones
      .filter((b) => /1 [A-Z]{3} =/.test(b.textContent))
      .map((b) => {
        const hijos = [...b.children].map((h) => h.getBoundingClientRect())
        const [nombre, valor] = hijos
        return {
          texto: b.textContent.trim().slice(0, 30),
          solapa:
            !!nombre &&
            !!valor &&
            nombre.left < valor.right &&
            valor.left < nombre.right &&
            nombre.top < valor.bottom &&
            valor.top < nombre.bottom,
        }
      }),
  )
  expect(cajas.length).toBeGreaterThan(0)
  for (const caja of cajas) {
    expect(caja.solapa, `el nombre y el valor de «${caja.texto}» se solapan`).toBe(false)
  }
})

// c.1: la pestaña activa de Configuración › Leads está a la vista cualquiera sea la sección y cuando el texto crece: antes de cargar (lo
// que tiene quien lo configuró así) y después de cargar (lo que pasa al ampliar con la página abierta).
const SECCIONES_DE_LEADS = ['campos', 'origenes', 'tipos', 'seguimientos'] as const

for (const seccion of SECCIONES_DE_LEADS) {
  test(`al 200 % antes de cargar: la pestaña activa «${seccion}» de Leads está a la vista`, async ({
    page,
  }) => {
    await textoGrandeAlCargar(page)
    await entrar(page)
    await page.goto(`/configuracion/leads?seccion=${seccion}`)
    await expect(page.getByRole('tab', { selected: true })).toBeVisible()
    // La pestaña abierta ya se ve con el HTML del servidor; la barra se desplaza hasta ella recién al hidratar (CI-3).
    await aLaVistaAlAcomodarse(page.getByRole('tab', { selected: true }), `la pestaña «${seccion}»`)
  })

  test(`al ampliar el texto con la página abierta: la pestaña activa «${seccion}» de Leads sigue a la vista`, async ({
    page,
  }) => {
    await entrar(page)
    await page.goto(`/configuracion/leads?seccion=${seccion}`)
    await expect(page.getByRole('tab', { selected: true })).toBeVisible()
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    await aLaVistaAlAcomodarse(page.getByRole('tab', { selected: true }), `la pestaña «${seccion}»`)
  })
}

// c.2: con el texto al 200 % se llega a «Sin icono» y a cada una de las 24 claves del selector desplazando el cuerpo del modal, con el pie
// fijo: cada opción recibe el clic y no cae bajo el pie.
for (const zoom of ['100', '200'] as const) {
  test(`al ${zoom} %: el selector de iconos llega a «Sin icono» y a las 24 claves con el pie fijo`, async ({
    page,
  }) => {
    if (zoom === '200') await textoGrandeAlCargar(page)
    await entrar(page)
    await page.goto('/configuracion/leads?seccion=seguimientos')
    await page.getByRole('button', { name: 'Nuevo tipo' }).click()
    const modal = page.getByRole('dialog', { name: 'Nuevo tipo de seguimiento' })
    await expect(modal).toBeVisible()
    const opciones = modal.getByRole('group', { name: 'Icono' }).locator('label')
    expect(await opciones.count(), 'Sin icono más las 24 claves').toBe(25)
    const pie = modal.locator('[data-slot=dialog-footer]')
    await expect(pie).toBeVisible()
    for (let i = 0; i < 25; i++) {
      const opcion = opciones.nth(i)
      await opcion.scrollIntoViewIfNeeded()
      await recibeElClic(opcion)
      const [caja, cajaDelPie] = await Promise.all([opcion.boundingBox(), pie.boundingBox()])
      expect(
        caja && cajaDelPie && caja.y + caja.height <= cajaDelPie.y + 0.5,
        `la opción ${String(i)} cae bajo el pie`,
      ).toBe(true)
    }
  })
}
