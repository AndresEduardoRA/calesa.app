import { expect, test, type Page } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarPersonasSembradas,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  sembrarPersonas,
} from './soporte/base'
import { ingresar } from './soporte/pasos'
import { capturar, textoGrandeAlCargar } from './soporte/recorrido'

// Las capturas de la lista del equipo con tope (5a-21 y 5a-26; `E2E_CAPTURAS=<carpeta>/{antes,despues}`): con 1.050 personas, la lista al
// entrar, su pie (donde va el aviso del tope), buscar a la persona 1.001 y el buscador con el marcador al 200 %. Sin asserts: lo que se
// puede afirmar vive en `equipo-tope` y `equipo-200`; este deja las imágenes para juzgar mirando, y tiene que poder correr contra el código
// de antes del arreglo (donde la lista dibuja 999 personas, no dice nada del corte y no encuentra a la 1.001).

const CLAVE = 'una-clave-de-prueba-9'
const PREFIJO = 'Tope'
const ULTIMA = 'Zoé Ñúñez Tope'

let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-tope-capturas-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Capturas' })
  sembrarPersonas(1050, PREFIJO)
  await crearPersona({
    email: correoDePrueba(`zoe-capturas-${info.project.name}`),
    contrasena: CLAVE,
    nombre: ULTIMA,
    invitada: true,
  })
})

test.afterAll(async () => {
  borrarPersonasSembradas(PREFIJO)
  await borrarPersonasDePrueba()
})

async function alPie(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
}

for (const zoom of ['100', '200'] as const) {
  test(`la lista del equipo con 1.050 personas al ${zoom} %`, async ({ page }, info) => {
    if (zoom === '200') await textoGrandeAlCargar(page)
    await page.goto('/ingreso')
    await ingresar(page, duena, CLAVE)
    await expect(page).toHaveURL('/')
    await page.goto('/configuracion/equipo')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await capturar(page, info, `lista-${zoom}`)
    await alPie(page)
    await capturar(page, info, `lista-pie-${zoom}`)
    await page.goto('/configuracion/equipo?q=zoe nunez')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await capturar(page, info, `busqueda-zoe-${zoom}`)
  })
}
