import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { idDePersona } from './soporte/leads-alta'
import { exigir } from './soporte/leads'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'

// Agenda (7.07-1, sólo lectura): el calendario en el día. El evento «seleccionados» de la dueña lo ve la asesora invitada y no un tercero; la tarea
// de la asesora la ve ella en su día y la dueña, sólo con «Ver la de todos». `?de=todos` sin permiso no rompe ni dibuja el interruptor.
// 7.07-2: la dueña crea, ve, edita y elimina un evento por la interfaz y le da una tarea a la asesora; la asesora los ve.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let eventoId = ''
let tareaId = ''
const rotulo = (proyecto: string) => `Agenda e2e ${proyecto}`

// «Nuevo evento» con la tecla N (insiste hasta que la página termina de hidratar): «Seleccionados» con la asesora de invitada.
async function crearEventoParaLaAsesora(page: Page, titulo: string, nombre: string) {
  // La tecla N abre «Nuevo evento» (insiste hasta que la página termina de hidratar).
  const nuevo = page.getByRole('dialog', { name: 'Nuevo evento', exact: true })
  await expect(async () => {
    await page.keyboard.press('n')
    await expect(nuevo).toBeVisible({ timeout: 1000 })
  }).toPass()
  await nuevo.getByLabel('Título', { exact: true }).fill(titulo)
  await nuevo.getByRole('radio', { name: /Seleccionados/ }).check()
  await nuevo.getByLabel('¿Con quién?').fill(nombre)
  await nuevo.getByRole('button', { name: nombre, exact: true }).click()
  await expect(nuevo.getByRole('button', { name: `Quitar a ${nombre}` })).toBeVisible()
  await nuevo.getByRole('button', { name: 'Crear evento' }).click()
}

// «Nueva tarea» para la asesora, que vence hoy al final del día.
async function crearTareaParaLaAsesora(page: Page, tarea: string, nombre: string, hoy: string) {
  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  const nueva = page.getByRole('dialog', { name: 'Nueva tarea', exact: true })
  await nueva.getByLabel('Título', { exact: true }).fill(tarea)
  await nueva.getByLabel('Vence').fill(`${hoy}T23:59`)
  await nueva.getByLabel('Para otra persona (opcional)').fill(nombre)
  await nueva.getByRole('button', { name: nombre, exact: true }).click()
  await nueva.getByRole('button', { name: 'Crear tarea' }).click()
}

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  const duena = await idDePersona(t.personas.duena)
  const berta = await idDePersona(t.personas.berta)
  const ahora = new Date().toISOString()
  // Recibir tareas: el rol de la asesora del terreno sólo trae permisos de leads; sin esto no sale entre quienes pueden recibir una tarea.
  const rol = await admin()
    .from('usuarios_roles')
    .select('rol_id')
    .eq('usuario_id', berta)
    .single<{ rol_id: string }>()
  exigir(rol.error, 'leer el rol de la asesora')
  exigir(
    (
      await admin()
        .from('roles_permisos')
        .insert({ rol_id: rol.data?.rol_id ?? '', permiso_clave: 'agenda.tareas.recibir' })
    ).error,
    'dar a la asesora el permiso de recibir tareas',
  )

  const evento = await admin()
    .from('eventos')
    .insert({
      titulo: `${rotulo(info.project.name)} reunión`,
      inicia_en: ahora,
      visibilidad: 'seleccionados',
      creado_por: duena,
    })
    .select('id')
    .single()
  exigir(evento.error, 'sembrar el evento')
  eventoId = evento.data?.id ?? ''
  exigir(
    (await admin().from('eventos_destinatarios').insert({ evento_id: eventoId, usuario_id: berta }))
      .error,
    'invitar a la asesora',
  )

  const tarea = await admin()
    .from('tareas')
    .insert({
      titulo: `${rotulo(info.project.name)} llamar`,
      vence_en: ahora,
      creado_por: duena,
      responsable_id: berta,
    })
    .select('id')
    .single()
  exigir(tarea.error, 'sembrar la tarea')
  tareaId = tarea.data?.id ?? ''
})

test.afterAll(async ({}, info) => {
  await admin().from('eventos').delete().eq('id', eventoId)
  await admin().from('tareas').delete().eq('id', tareaId)
  // Lo que crea la prueba de la interfaz (se borra por su rótulo; el evento eliminado sigue ahí, sólo marcado).
  await admin()
    .from('eventos')
    .delete()
    .like('titulo', `${rotulo(info.project.name)} nuevo%`)
  await admin()
    .from('tareas')
    .delete()
    .like('titulo', `${rotulo(info.project.name)} nueva%`)
  await limpiarListado(t)
})

test('la asesora ve el evento y su tarea en el día; un tercero no ve el evento', async ({
  page,
}, info) => {
  const evento = new RegExp(`${rotulo(info.project.name)} reunión`)
  const tarea = new RegExp(`${rotulo(info.project.name)} llamar`)

  await entrar(page, t.personas.berta)
  await page.goto('/agenda?vista=dia')
  const dia = page.getByRole('main')
  await expect(
    dia.getByRole('listitem').filter({ hasText: evento }).getByText('Evento'),
  ).toBeVisible()
  await expect(
    dia.getByRole('listitem').filter({ hasText: tarea }).getByText('Tarea'),
  ).toBeVisible()
  // Sin `agenda.ver_todo` no hay interruptor, y pedir la de todos por la URL no rompe: se ve la suya.
  await expect(page.getByRole('switch', { name: 'Ver la de todos' })).toBeHidden()
  await page.goto('/agenda?vista=dia&de=todos')
  await expect(dia.getByText(evento)).toBeVisible()

  // Un tercero (otra asesora, no invitada): ni el evento ni la tarea.
  await page.context().clearCookies()
  await entrar(page, t.personas.carlos)
  await page.goto('/agenda?vista=dia')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(evento)).toBeHidden()
  await expect(page.getByText(tarea)).toBeHidden()
})

test('la dueña ve la tarea de la asesora con «Ver la de todos» y lo elegido queda en la URL', async ({
  page,
}, info) => {
  const tarea = new RegExp(`${rotulo(info.project.name)} llamar`)
  await entrar(page, t.personas.duena)
  await page.goto('/agenda?vista=dia')
  await expect(page.getByText(tarea)).toBeHidden()
  const interruptor = page.getByRole('switch', { name: 'Ver la de todos' })
  await interruptor.click()
  await expect(page).toHaveURL(/de=todos/)
  await expect(page.getByText(tarea)).toBeVisible()

  // Navegar guarda lo elegido en la URL.
  await page.getByRole('tab', { name: 'Semana' }).click()
  await expect(page).toHaveURL(/vista=semana/)
  await expect(page).toHaveURL(/de=todos/)

  // El mes (grilla en el escritorio, lista en el celular) trae lo mismo.
  await page.getByRole('tab', { name: 'Mes' }).click()
  await expect(page).toHaveURL(/vista=mes/)
  await expect(page.getByText(tarea)).toBeVisible()
})

// @sin-celular: el camino feliz de crear, editar y eliminar es el mismo en el celular; los paneles se miden aparte en la Fase 9
test('E2E la dueña crea, ve, edita y elimina un evento y le da una tarea a la asesora', async ({
  page,
}, info) => {
  const titulo = `${rotulo(info.project.name)} nuevo evento`
  const editado = `${titulo} editado`
  const tarea = `${rotulo(info.project.name)} nueva tarea`
  const berta = await admin()
    .from('perfiles')
    .select('nombre')
    .eq('id', await idDePersona(t.personas.berta))
    .single()
  exigir(berta.error, 'leer el nombre de la asesora')
  const nombre = berta.data?.nombre ?? ''
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date())

  await entrar(page, t.personas.duena)
  await page.goto('/agenda?vista=dia')
  await crearEventoParaLaAsesora(page, titulo, nombre)

  // Crear lleva al detalle del evento nuevo, con la asesora entre los invitados.
  const detalle = page.getByRole('dialog', { name: 'Evento', exact: true })
  await expect(detalle.getByRole('heading', { name: titulo })).toBeVisible()
  await expect(detalle.getByText(nombre)).toBeVisible()
  await expect(page).toHaveURL(/evento=/)
  await page.keyboard.press('Escape')
  await expect(detalle).toBeHidden()
  await expect(page.getByRole('main').getByRole('link', { name: new RegExp(titulo) })).toBeVisible()

  // La tarea para la asesora, que vence hoy al final del día.
  await crearTareaParaLaAsesora(page, tarea, nombre, hoy)
  const detalleDeTarea = page.getByRole('dialog', { name: 'Tarea', exact: true })
  await expect(detalleDeTarea.getByRole('heading', { name: tarea })).toBeVisible()
  await expect(detalleDeTarea.getByText(nombre)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detalleDeTarea).toBeHidden()

  // Editar el título del evento desde su panel.
  await page
    .getByRole('main')
    .getByRole('link', { name: new RegExp(titulo) })
    .click()
  await detalle.getByRole('button', { name: 'Editar' }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar evento', exact: true })
  await edicion.getByLabel('Título', { exact: true }).fill(editado)
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(detalle.getByRole('heading', { name: editado })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detalle).toBeHidden()

  // La asesora ve el evento y la tarea con sus palabras, y no puede editar ni eliminar lo que no creó.
  await page.context().clearCookies()
  await entrar(page, t.personas.berta)
  await page.goto('/agenda?vista=dia')
  const dia = page.getByRole('main')
  // El chip dice su clase con texto, además del título.
  await expect(
    dia.getByRole('link', { name: new RegExp(`^Evento [0-9]+:[0-9]+ ${editado}`) }),
  ).toBeVisible()
  await expect(
    dia.getByRole('link', { name: new RegExp(`^Tarea [0-9]+:[0-9]+ ${tarea}`) }),
  ).toBeVisible()
  await dia.getByRole('link', { name: new RegExp(editado) }).click()
  await expect(detalle.getByRole('heading', { name: editado })).toBeVisible()
  await expect(detalle.getByRole('button', { name: 'Editar' })).toBeHidden()
  await expect(detalle.getByRole('button', { name: 'Eliminar' })).toBeHidden()

  // La dueña elimina el evento (confirma por URL) y deja de verse.
  await page.context().clearCookies()
  await entrar(page, t.personas.duena)
  await page.goto('/agenda?vista=dia')
  await page
    .getByRole('main')
    .getByRole('link', { name: new RegExp(editado) })
    .click()
  await detalle.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page).toHaveURL(/eliminar=evento/)
  await page.getByRole('button', { name: 'Eliminar evento' }).click()
  await expect(page).not.toHaveURL(/evento=/)
  await expect(page.getByRole('main').getByText(editado)).toBeHidden()
})
