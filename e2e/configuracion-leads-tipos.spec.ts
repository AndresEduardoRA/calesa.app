import type { Locator } from '@playwright/test'
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { descartarAviso } from './soporte/inventario'
import {
  cerrarMenu,
  elegirDelMenu,
  lineaApagada,
  lineaDelMenu,
  menuDe,
} from './soporte/lista-de-catalogo'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import {
  PREFIJO_DE_TIPO_E2E,
  abrirTipos,
  borrarTiposDePrueba,
  filaDeTipo,
  modalDeTipo,
  nombresEnPantalla,
  sembrarTipo,
  tipoDeFabrica,
  tipoEnLaBase,
  tiposEnLaBase,
} from './soporte/tipos-de-lead'

// Configuración › Leads › Tipos de lead (9j) contra la app compilada y el Supabase local: crear (la clase se elige y es obligatoria),
// renombrar (la clase se ve y no se toca), ordenar con el teclado, desactivar —con «Deshacer», y el último activo de su clase no se
// apaga y la fila lo dice antes— y eliminar sólo sin leads. Los casos no felices, en `configuracion-leads-tipos-casos.spec.ts`;
// cómo se nota en el alta, la ficha y el listado, en `leads-tipos-pantallas.spec.ts`. Todo lo que crea lleva «E2E 9j» y se borra.
test.describe.configure({ mode: 'serial' })

let duena = ''
let proyecto = ''
const nombre = (resto: string) => `${PREFIJO_DE_TIPO_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarTiposDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-tipos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Tipos' })
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarTiposDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// Elige la clase como una persona: pulsando su tarjeta (el radio está oculto a la vista y es lo que lee el lector de pantalla).
export async function elegirClase(modal: Locator, clase: 'Prospecto' | 'Cliente') {
  await modal.locator('label', { hasText: new RegExp(`^${clase}`) }).click()
}

async function nuevoTipo(page: Page, texto: string, clase: 'Prospecto' | 'Cliente' | null) {
  await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
  const modal = modalDeTipo(page, 'Nuevo tipo')
  await modal.getByLabel('Nombre').fill(texto)
  if (clase) {
    await elegirClase(modal, clase)
  }
  await modal.getByRole('button', { name: 'Crear tipo' }).click()
  return modal
}

test('se crea un tipo: la clase es obligatoria y el nombre vacío o repetido se rechaza junto al campo', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirTipos(page)
  // De fábrica: Prospecto y Cliente, cada uno con su clase.
  await expect(filaDeTipo(page, 'Prospecto')).toBeVisible()
  await expect(filaDeTipo(page, 'Cliente')).toBeVisible()
  const uno = nombre('Uno')

  // Sin elegir la clase no se crea, y el foco va a ella.
  const sinClase = await nuevoTipo(page, uno, null)
  await expect(sinClase.getByText('Elige la clase del tipo: prospecto o cliente.')).toBeVisible()
  await expect(sinClase.getByRole('radio').first()).toBeFocused()
  expect(await tipoEnLaBase(uno)).toBeUndefined()

  // Con espacios de más: se guarda limpio, de la clase elegida.
  await sinClase.getByLabel('Nombre').fill(`   ${uno.replace(' ', '   ')}  `)
  await elegirClase(sinClase, 'Cliente')
  await sinClase.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(sinClase).toBeHidden()
  await descartarAviso(page, 'Tipo creado.')
  expect(await tipoEnLaBase(uno)).toMatchObject({ activo: true, clase: 'cliente' })
  await expect(filaDeTipo(page, uno)).toBeVisible()
  // Queda al final de la lista, con su clase a la vista.
  expect((await nombresEnPantalla(page)).at(-1)).toBe(uno)
  await expect(filaDeTipo(page, uno).getByText('Cliente', { exact: true })).toBeVisible()

  // Vacío.
  await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
  const vacio = modalDeTipo(page, 'Nuevo tipo')
  await elegirClase(vacio, 'Prospecto')
  await vacio.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(vacio.getByText('Escribe el nombre del tipo.')).toBeVisible()
  await expect(vacio.getByLabel('Nombre')).toHaveAttribute('aria-invalid', 'true')

  // Repetido, sin importar mayúsculas.
  await vacio.getByLabel('Nombre').fill(uno.toUpperCase())
  await vacio.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(vacio.getByText(`Ya hay un tipo «${uno.toUpperCase()}».`)).toBeVisible()
  expect(
    (await tiposEnLaBase()).filter((t) => t.nombre.toLowerCase() === uno.toLowerCase()),
  ).toHaveLength(1)

  // Cerrar con algo escrito pregunta antes de descartar.
  await vacio.getByLabel('Nombre').fill('Algo sin guardar')
  await vacio.getByRole('button', { name: 'Cancelar' }).click()
  await expect(vacio.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await vacio.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(vacio.getByLabel('Nombre')).toHaveValue('Algo sin guardar')
  await vacio.getByRole('button', { name: 'Cancelar' }).click()
  await vacio.getByRole('button', { name: 'Descartar' }).click()
  await expect(vacio).toBeHidden()
  expect(page.url()).not.toContain('panel=')
})

test('se renombra y la clase se ve sin poder cambiarla; un nombre ya tomado o vacío no pasa', async ({
  page,
}) => {
  const uno = nombre('Uno')
  const dos = nombre('Dos')
  await sembrarTipo(dos)
  const antes = await tipoEnLaBase(uno)
  await entrar(page, duena)
  await abrirTipos(page)

  await page.getByRole('button', { name: `Abrir ${uno}`, exact: true }).click()
  const modal = modalDeTipo(page, 'Editar tipo')
  await expect(modal.getByLabel('Nombre')).toHaveValue(uno)
  // La clase de este tipo, marcada y quieta.
  await expect(modal.getByRole('radio', { name: /^Cliente/ })).toBeChecked()
  await expect(modal.getByRole('radio', { name: /^Prospecto/ })).toBeDisabled()
  await expect(modal.getByRole('radio', { name: /^Cliente/ })).toBeDisabled()
  await expect(modal.getByText('La clase se elige al crear el tipo y no se cambia.')).toBeVisible()
  await modal.getByLabel('Nombre').fill(dos)
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal.getByText(`Ya hay un tipo «${dos}».`)).toBeVisible()
  await modal.getByLabel('Nombre').fill('   ')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal.getByText('Escribe el nombre del tipo.')).toBeVisible()
  await modal.getByLabel('Nombre').fill(nombre('Primero'))
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toBeHidden()
  await descartarAviso(page, 'Tipo guardado.')
  expect(await tipoEnLaBase(uno)).toBeUndefined()
  // Mismo tipo: la clave y la clase no se movieron.
  expect(await tipoEnLaBase(nombre('Primero'))).toMatchObject({
    id: antes?.id,
    clave: antes?.clave,
    clase: 'cliente',
  })
})

test('se ordena con el teclado: sube, baja y el foco se queda en el botón', async ({ page }) => {
  const primero = nombre('Primero')
  const segundo = nombre('Dos')
  const tercero = nombre('Tres')
  await sembrarTipo(tercero)
  await entrar(page, duena)
  await abrirTipos(page)
  const propios = async () =>
    (await nombresEnPantalla(page)).filter((n) => n.startsWith(PREFIJO_DE_TIPO_E2E))
  expect(await propios()).toEqual([primero, segundo, tercero])

  const subir = page.getByRole('button', { name: `Subir ${tercero}` })
  await subir.focus()
  await page.keyboard.press('Enter')
  await expect.poll(propios).toEqual([primero, tercero, segundo])
  // El foco siguió al botón de esa fila, que ahora está un lugar más arriba, y el lector lo anunció.
  await expect(subir).toBeFocused()
  await expect(page.getByRole('status').filter({ hasText: 'quedó en el lugar' })).toContainText(
    tercero,
  )
  expect(
    (await tiposEnLaBase())
      .filter((t) => t.nombre.startsWith(PREFIJO_DE_TIPO_E2E))
      .map((t) => t.nombre),
  ).toEqual([primero, tercero, segundo])
  expect(new Set((await tiposEnLaBase()).map((t) => t.orden)).size).toBe(
    (await tiposEnLaBase()).length,
  )

  // Bajarlo de nuevo, otra vez con el teclado.
  const bajar = page.getByRole('button', { name: `Bajar ${tercero}` })
  await bajar.focus()
  await page.keyboard.press('Space')
  await expect.poll(propios).toEqual([primero, segundo, tercero])
  // Quedó último de todos: «Bajar» se apagó y el foco pasó a «Subir», que sigue a mano.
  await expect(bajar).toBeDisabled()
  await expect(subir).toBeFocused()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('el último activo de su clase no se apaga ni se elimina, y la fila lo dice antes de intentarlo', async ({
  page,
}) => {
  const uno = nombre('Primero')
  // Los otros de la clase cliente que dejaron los casos de antes se apagan por la base: quedan «Cliente» y «Primero».
  const { error } = await admin()
    .from('tipos_lead')
    .update({ activo: false })
    .in('nombre', [nombre('Dos'), nombre('Tres')])
  expect(error).toBeNull()
  await entrar(page, duena)
  await abrirTipos(page)
  // «Prospecto» es el único activo de su clase: apagado y con el motivo; tampoco se elimina.
  const desactivarProspecto = await lineaDelMenu(page, 'Prospecto', 'Desactivar')
  await expect(desactivarProspecto).toBeDisabled()
  await expect(
    page.getByText('Es el único tipo activo de la clase «prospecto»: activa o crea otro antes.'),
  ).toBeVisible()
  await expect(
    menuDe(page, 'Prospecto').getByRole('menuitem', { name: 'Eliminar', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByText('«Prospecto» es el único tipo activo de la clase «prospecto»: no se elimina.'),
  ).toBeVisible()
  await cerrarMenu(page, 'Prospecto')

  // La clase cliente tiene dos activos («Cliente» y «Primero»): se puede apagar uno...
  expect(await lineaApagada(page, 'Cliente', 'Desactivar')).toBe(false)
  await elegirDelMenu(page, uno, 'Desactivar')
  await expect(filaDeTipo(page, uno).getByText('Desactivado')).toBeVisible()
  expect(await tipoEnLaBase(uno)).toMatchObject({ activo: false })
  // ...y entonces el que queda es el último de su clase.
  expect(await lineaApagada(page, 'Cliente', 'Desactivar')).toBe(true)

  // «Deshacer» lo vuelve a encender y «Cliente» ya puede apagarse otra vez.
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(filaDeTipo(page, uno).getByText('Desactivado')).toHaveCount(0)
  expect(await tipoEnLaBase(uno)).toMatchObject({ activo: true })
  expect(await lineaApagada(page, 'Cliente', 'Desactivar')).toBe(false)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('desactivar un tipo con leads: se conserva en ellos y deja de ofrecerse; con leads no se elimina', async ({
  page,
}) => {
  const uno = nombre('Primero')
  const tipo = await tipoEnLaBase(uno)
  const leadId = await crearLead({
    nombre: `Lead de ${uno}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  await admin()
    .from('leads')
    .update({ tipo_lead_id: tipo?.id ?? '' })
    .eq('id', leadId)

  await entrar(page, duena)
  await abrirTipos(page)
  const fila = filaDeTipo(page, uno)
  await expect(fila.getByText('Tiene leads', { exact: true })).toBeVisible()
  await elegirDelMenu(page, uno, 'Desactivar')
  await expect(fila.getByText('Desactivado')).toBeVisible()
  await expect(fila.getByText('Tiene leads', { exact: true })).toBeVisible()
  expect(await tipoEnLaBase(uno)).toMatchObject({ activo: false })

  await expect(await lineaDelMenu(page, uno, 'Eliminar')).toBeDisabled()
  await expect(page.getByText(new RegExp(`«${uno}» ya tiene leads`))).toBeVisible()
  await cerrarMenu(page, uno)

  // Lo vuelve a encender, para lo que sigue.
  await elegirDelMenu(page, uno, 'Activar')
  await expect(fila.getByText('Desactivado')).toHaveCount(0)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('eliminar sin leads pide confirmar nombrando el tipo', async ({ page }) => {
  const dos = nombre('Dos')
  await entrar(page, duena)
  await abrirTipos(page)

  await elegirDelMenu(page, dos, 'Eliminar')
  const confirmar = page.getByRole('dialog', { name: `Eliminar el tipo «${dos}»` })
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole('button', { name: 'Cancelar' }).click()
  expect(await tipoEnLaBase(dos)).toBeDefined()

  await elegirDelMenu(page, dos, 'Eliminar')
  await page
    .getByRole('dialog', { name: `Eliminar el tipo «${dos}»` })
    .getByRole('button', { name: 'Eliminar tipo' })
    .click()
  await descartarAviso(page, `«${dos}» eliminado.`)
  await expect(filaDeTipo(page, dos)).toHaveCount(0)
  expect(await tipoEnLaBase(dos)).toBeUndefined()
  // Los de fábrica siguen.
  expect((await tipoDeFabrica('prospecto')).activo).toBe(true)
})
