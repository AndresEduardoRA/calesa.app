import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { noAbre } from './soporte/confirmar-por-url'
import { sesionDe } from './soporte/leads-alta'
import {
  PREFIJO_DE_NIVEL_E2E,
  abrirNiveles,
  borrarNivelesDePrueba,
  elegirDelMenu,
  filaDeNivel,
  llenarNivelesHasta,
  masAccionesDe,
  menuDe,
  modalDeNivel,
  nivelEnLaBase,
  ponerNivelEnUso,
  retirados,
  sembrarNivel,
} from './soporte/niveles'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'

// Los casos no felices de Configuración › Cotización › Niveles (paso 4.09-2): el nombre vacío, repetido, largo o de una clave que ya existe; un nivel
// en uso (se retira, no se elimina, y lo dice la base); una pestaña vieja que intenta eliminar uno que otra persona puso en uso; el tope de 10 con los
// retirados dentro; dos personas editando el mismo nivel; una URL que nombra uno que no existe; y una URL que nombra uno que no existe. Quién ve qué está en `*-permisos`.
test.describe.configure({ mode: 'serial' })

let duena = ''
let proyecto = ''
const nombre = (resto: string) => `${PREFIJO_DE_NIVEL_E2E} ${resto} ${proyecto}`
const INEXISTENTE = '00000000-0000-4000-8000-000000000000'

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-niveles-casos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Casos' })
})

test.afterAll(async () => {
  borrarNivelesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('el nombre vacío, repetido con otras mayúsculas, de más de 40 caracteres o de una clave que ya existe se rechaza junto al campo', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await abrirNiveles(page)
  await page.getByRole('button', { name: 'Nuevo nivel' }).click()
  const modal = modalDeNivel(page, 'Nuevo nivel de acceso')
  await modal.getByRole('button', { name: 'Crear nivel' }).click()
  await expect(modal.getByText('Escribe el nombre del nivel.')).toBeVisible()
  await modal.getByLabel('Nombre').fill('   ')
  await modal.getByRole('button', { name: 'Crear nivel' }).click()
  await expect(modal.getByText('Escribe el nombre del nivel.')).toBeVisible()
  await modal.getByLabel('Nombre').fill('  COSTOS ')
  await modal.getByRole('button', { name: 'Crear nivel' }).click()
  await expect(modal.getByText('Ya hay un nivel «COSTOS».')).toBeVisible()
  await modal.getByLabel('Nombre').fill('x'.repeat(41))
  await modal.getByRole('button', { name: 'Crear nivel' }).click()
  await expect(modal.getByText('admite hasta 40 caracteres')).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'niveles-nombre-rechazado')
  // Lo escrito queda y, corregido, se guarda.
  await modal.getByLabel('Nombre').fill(nombre('Clave'))
  await modal.getByRole('button', { name: 'Crear nivel' }).click()
  await expect(modal).toBeHidden()
  expect(nivelEnLaBase(nombre('Clave'))).toBeDefined()

  // Otro nombre que da la misma clave (la puntuación se va): la base lo rechaza con su texto, junto al campo.
  await page.getByRole('button', { name: 'Nuevo nivel' }).click()
  await modal.getByLabel('Nombre').fill(`${nombre('Clave')}!`)
  await modal.getByRole('button', { name: 'Crear nivel' }).click()
  await expect(modal.getByText(/Ya hay un nivel con la clave «/)).toBeVisible()
  expect(nivelEnLaBase(`${nombre('Clave')}!`)).toBeUndefined()
  await page.keyboard.press('Escape')
  await modal.getByRole('button', { name: 'Descartar' }).click()

  // Renombrar con el nombre de otro, tampoco.
  await page.getByRole('button', { name: `Abrir ${nombre('Clave')}`, exact: true }).click()
  const edicion = modalDeNivel(page, 'Renombrar nivel')
  await edicion.getByLabel('Nombre').fill('costos')
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(edicion.getByText('Ya hay un nivel «costos».')).toBeVisible()
  await page.keyboard.press('Escape')
  await edicion.getByRole('button', { name: 'Descartar' }).click()
})

test('un nivel en uso: Eliminar apagado con el motivo de la base y Retirar al lado; se retira y sigue sin eliminarse', async ({
  page,
}, info) => {
  const uso = sembrarNivel(nombre('Con uso'))
  ponerNivelEnUso(uso.clave)
  await entrar(page, duena)
  await abrirNiveles(page)
  const fila = filaDeNivel(page, uso.nombre)
  await expect(fila.getByText('En uso', { exact: true })).toBeVisible()
  await masAccionesDe(page, uso.nombre).click()
  await expect(page.getByRole('menuitem', { name: 'Retirar', exact: true })).toBeEnabled()
  await expect(page.getByRole('menuitem', { name: 'Eliminar', exact: true })).toBeDisabled()
  await expect(menuDe(page, uso.nombre)).toContainText(
    'Está en 2 celdas de 1 origen (en alguna versión de su fórmula): no se elimina. Puedes retirarlo',
  )
  await capturar(page, info, 'niveles-en-uso-menu')
  await page.keyboard.press('Escape')

  // Una URL que pide eliminarlo no abre y dice por qué.
  await noAbre(
    page,
    `/configuracion/cotizacion?seccion=niveles&panel=eliminar-nivel&nivel=${uso.id}`,
    /Está en 2 celdas de 1 origen/,
    /panel=eliminar-nivel/,
  )
  // Y la base lo rechaza aunque se llame sin la pantalla.
  const cliente = await sesionDe(duena, CONTRASENA)
  const r = await cliente.rpc('nivel_eliminar', {
    p_id: uso.id,
    p_actualizado_en_esperado: nivelEnLaBase(uso.nombre)?.actualizado_en ?? '',
  })
  expect(r.error?.code).toBe('23503')
  expect(r.error?.message).toContain('Está en 2 celdas de 1 origen')

  // Retirarlo: sí. Ya retirado sigue en uso: no se elimina, y el motivo no le ofrece retirarse otra vez.
  await elegirDelMenu(page, uso.nombre, 'Retirar')
  await expect(retirados(page).getByText(uso.nombre, { exact: true })).toBeVisible()
  await masAccionesDe(page, uso.nombre).click()
  await expect(page.getByRole('menuitem', { name: 'Eliminar', exact: true })).toBeDisabled()
  await expect(menuDe(page, uso.nombre)).toContainText(
    /Está en 2 celdas de 1 origen .*: no se elimina\./,
  )
  await expect(menuDe(page, uso.nombre)).not.toContainText('Puedes retirarlo')
  await capturar(page, info, 'niveles-retirado-en-uso-menu')
  await page.keyboard.press('Escape')
})

test('una pestaña vieja que intenta eliminar uno que otra persona puso en uso: se dice el motivo y la lista se actualiza', async ({
  page,
}, info) => {
  const viejo = sembrarNivel(nombre('Pestaña vieja'))
  await entrar(page, duena)
  await abrirNiveles(page)
  await expect(filaDeNivel(page, viejo.nombre).getByText('Sin uso')).toBeVisible()
  // Otra persona lo puso en uso (un borrador de fórmula) mientras esta pantalla seguía abierta.
  ponerNivelEnUso(viejo.clave)
  await elegirDelMenu(page, viejo.nombre, 'Eliminar')
  const dialogo = page.getByRole('dialog', { name: `Eliminar el nivel «${viejo.nombre}»` })
  await dialogo.getByRole('button', { name: 'Eliminar nivel' }).click()
  await expect(dialogo).toBeHidden()
  await expect(page.getByText(/Está en 2 celdas de 1 origen/).first()).toBeVisible()
  await capturar(page, info, 'niveles-pestana-vieja')
  // La lista se vuelve a leer: ahora lo muestra en uso, con Eliminar apagado.
  await expect(filaDeNivel(page, viejo.nombre).getByText('En uso', { exact: true })).toBeVisible()
  expect(nivelEnLaBase(viejo.nombre)).toBeDefined()
})

test('el tope de 10: los retirados cuentan, «Nuevo nivel» se apaga diciendo por qué y la base no deja pasar', async ({
  page,
}, info) => {
  borrarNivelesDePrueba()
  llenarNivelesHasta(10)
  await entrar(page, duena)
  await abrirNiveles(page)
  await expect(page.getByText('10 de 10 niveles posibles.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo nivel' })).toBeDisabled()
  await expect(
    page.getByText(
      'Ya hay 10 niveles, que es el máximo. Los retirados también cuentan: elimina uno que ninguna hoja use para crear otro.',
    ),
  ).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'niveles-tope')
  // Retirar uno no libera lugar: sigue contando.
  const rellenoReal = `${PREFIJO_DE_NIVEL_E2E} relleno 01`
  await elegirDelMenu(page, rellenoReal, 'Retirar')
  await expect(retirados(page).getByText(rellenoReal, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo nivel' })).toBeDisabled()
  // Por la URL tampoco abre, y dice el motivo.
  await noAbre(
    page,
    '/configuracion/cotizacion?seccion=niveles&panel=nuevo-nivel',
    /Ya hay 10 niveles, que es el máximo/,
    /panel=nuevo-nivel/,
  )
  // Y la base lo rechaza aunque se llame sin la pantalla.
  const cliente = await sesionDe(duena, CONTRASENA)
  const crear = await cliente.rpc('nivel_crear', {
    p_id: crypto.randomUUID(),
    p_nombre: nombre('El once'),
  })
  expect(crear.error?.message).toContain('máximo')
  // Eliminar uno que ninguna hoja usa libera el lugar.
  await elegirDelMenu(page, rellenoReal, 'Eliminar')
  const dialogo = page.getByRole('dialog', { name: `Eliminar el nivel «${rellenoReal}»` })
  await dialogo.getByRole('button', { name: 'Eliminar nivel' }).click()
  await expect(dialogo).toBeHidden()
  await expect(page.getByText('9 de 10 niveles posibles.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo nivel' })).toBeEnabled()
  borrarNivelesDePrueba()
})

test('dos personas renombrando el mismo nivel: la segunda ve el conflicto, lo escrito queda y «Recargar» deja guardar', async ({
  page,
  browser,
}, info) => {
  const base = sembrarNivel(nombre('Conflicto'))
  await entrar(page, duena)
  await abrirNiveles(page)
  await page.getByRole('button', { name: `Abrir ${base.nombre}`, exact: true }).click()
  const primera = modalDeNivel(page, 'Renombrar nivel')
  await primera.getByLabel('Nombre').fill(nombre('Conflicto A'))

  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  const otra = await contexto.newPage()
  await entrar(otra, duena, { fresco: true })
  await abrirNiveles(otra)
  await otra.getByRole('button', { name: `Abrir ${base.nombre}`, exact: true }).click()
  const segunda = modalDeNivel(otra, 'Renombrar nivel')
  await segunda.getByLabel('Nombre').fill(nombre('Conflicto B'))
  await segunda.getByRole('button', { name: 'Guardar' }).click()
  await expect(segunda).toBeHidden()

  await primera.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Otra persona cambió este nivel mientras lo editabas.')).toBeVisible()
  await expect(primera.getByLabel('Nombre')).toHaveValue(nombre('Conflicto A'))
  await capturar(page, info, 'niveles-conflicto')
  expect(nivelEnLaBase(nombre('Conflicto B'))).toBeDefined()
  // «Recargar» trae la versión nueva sin perder lo escrito, y entonces sí se guarda.
  await primera.getByRole('button', { name: 'Recargar' }).click()
  await expect(page.getByText('Otra persona cambió este nivel mientras lo editabas.')).toBeHidden()
  await expect(primera.getByLabel('Nombre')).toHaveValue(nombre('Conflicto A'))
  await primera.getByRole('button', { name: 'Guardar' }).click()
  await expect(primera).toBeHidden()
  expect(nivelEnLaBase(nombre('Conflicto A'))).toBeDefined()
  await contexto.close()
})

test('una URL que nombra un nivel que no existe, o uno que no se puede cambiar, no abre nada y lo dice', async ({
  page,
}) => {
  await entrar(page, duena)
  await noAbre(
    page,
    `/configuracion/cotizacion?seccion=niveles&panel=renombrar-nivel&nivel=${INEXISTENTE}`,
    'Ese nivel ya no existe.',
    /panel=renombrar-nivel/,
  )
  await noAbre(
    page,
    `/configuracion/cotizacion?seccion=niveles&panel=eliminar-nivel&nivel=${INEXISTENTE}`,
    'Ese nivel ya no existe.',
    /panel=eliminar-nivel/,
  )
  // «Todos» no se renombra ni se elimina, ni escribiendo la URL.
  const todos = nivelEnLaBase('Todos')
  await noAbre(
    page,
    `/configuracion/cotizacion?seccion=niveles&panel=renombrar-nivel&nivel=${todos?.id ?? ''}`,
    'El nivel «Todos» no se renombra.',
    /panel=renombrar-nivel/,
  )
  // Una pestaña que no existe abre la primera.
  await page.goto('/configuracion/cotizacion?seccion=otra')
  await expect(page.getByRole('heading', { name: 'Niveles de acceso', level: 2 })).toBeVisible()
})
