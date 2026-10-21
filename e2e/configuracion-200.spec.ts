import { expect, test, type Locator, type Page } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenes } from './soporte/origenes'
import { ingresar } from './soporte/pasos'
import {
  aLaVistaSinDesplazar,
  recibeElClic,
  sinScrollHorizontal,
  textoGrandeAlCargar,
} from './soporte/recorrido'

// Configuración al 200 % del texto (5a-18 y c.1/c.2 de la sesión de defectos al 200 %): cada pantalla de Configuración, en el celular y en
// escritorio, no ensancha la página (`sinScrollHorizontal`), deja a la vista su título, su pestaña activa y lo que pone al borde derecho
// (`aLaVistaSinDesplazar`). El texto crece **antes** de cargar, como lo tiene quien lo configuró en su navegador: lo que se mide es lo
// que esa persona ve al entrar. Una prueba por pantalla y sin `serial`: cuando una cae, las demás siguen y dicen cuáles más fallan.

const CLAVE = 'una-clave-de-prueba-9'
let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  duena = correoDePrueba(`duena-200-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Doscientos' })
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
  { titulo: 'Leads › Campos', url: () => '/configuracion/leads?seccion=campos' },
  { titulo: 'Leads › Orígenes del lead', url: () => '/configuracion/leads?seccion=origenes' },
  { titulo: 'Leads › Tipos de lead', url: () => '/configuracion/leads?seccion=tipos' },
  {
    titulo: 'Leads › Tipos de seguimiento',
    url: () => '/configuracion/leads?seccion=seguimientos',
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
      await aLaVistaSinDesplazar(activa.first(), 'la pestaña activa')
    }
    for (const [lugar, que] of pantalla.controles?.(page) ?? []) {
      await aLaVistaSinDesplazar(lugar, que)
    }
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
