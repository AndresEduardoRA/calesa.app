import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  PREFIJO_DE_NIVEL_E2E,
  abrirNiveles,
  borrarNivelesDePrueba,
  elegirDelMenu,
  filaDeNivel,
  ponerNivelEnUso,
  retirados,
  sembrarNivel,
} from './soporte/niveles'
import {
  quePisaElAviso,
  textosQueNoSeVenEnteros,
  traerALaVista,
} from './soporte/niveles-a-la-vista'
import { capturar, quieto, recibeElClic, sinScrollHorizontal } from './soporte/recorrido'

// Configuración › Cotización › Niveles con el texto al 200 % (4-15, visto al mirar las capturas del 4.09-2): el estado y el uso de cada fila (de fábrica, creada,
// en uso, sin uso y retirada) se leen enteros —con la tabla de escritorio, la columna del «⋯» pegada a la derecha los tapaba— y un aviso no tapa ningún texto
// de la lista ni el «⋯» de una fila. Con la dueña, en escritorio y celular; lo que se juzga mirando, en `E2E_CAPTURAS=e2e-capturas/4-15-niveles-200/<carpeta>`.
test.describe.configure({ mode: 'serial' })

let duena = ''
let proyecto = ''
const nombre = (resto: string) => `${PREFIJO_DE_NIVEL_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-niveles-200-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Doscientos' })
})

test.afterAll(async () => {
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('al 200 %: el estado y el uso de cada fila se ven enteros, y un aviso no tapa ningún texto de la lista', async ({
  page,
}, info) => {
  const enUso = sembrarNivel(nombre('Alfa 200'))
  const sinUso = sembrarNivel(nombre('Beta 200'))
  const retirado = sembrarNivel(nombre('Gamma 200'), { retirado: true })
  ponerNivelEnUso(enUso.clave)
  await entrar(page, duena)
  await abrirNiveles(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await sinScrollHorizontal(page)
  // De fábrica («Todos» y «Costos», en uso), uno creado en uso, uno sin uso y uno retirado.
  await expect(filaDeNivel(page, enUso.nombre).getByText('En uso', { exact: true })).toBeVisible()
  await expect(filaDeNivel(page, sinUso.nombre).getByText('Sin uso')).toBeVisible()
  await expect(retirados(page).getByText(retirado.nombre, { exact: true })).toBeVisible()
  await traerALaVista(page, 'niveles')
  await capturar(page, info, 'niveles-200-filas')
  await traerALaVista(page, 'retirados')
  await capturar(page, info, 'niveles-200-retirados')
  expect
    .soft(await textosQueNoSeVenEnteros(page), 'cada texto de las filas se ve entero')
    .toEqual([])

  // Un aviso a la vista (retirar, con «Deshacer»): no tapa texto ni botones de la lista. En el celular los avisos van de lado a lado abajo y la página se
  // desplaza: ahí no se mide.
  if (info.project.name === 'escritorio') {
    await elegirDelMenu(page, sinUso.nombre, 'Retirar')
    const aviso = page
      .locator('[data-sonner-toast]')
      .filter({ hasText: `«${sinUso.nombre}» retirado.` })
    await expect(aviso).toBeVisible()
    await quieto(aviso)
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    await capturar(page, info, 'niveles-200-aviso')
    expect.soft(await quePisaElAviso(page), 'el aviso tapa texto o botones de la lista').toEqual([])
    await recibeElClic(aviso.getByRole('button', { name: 'Deshacer' }))
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
})
