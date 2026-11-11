import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { idDePersona } from './soporte/leads-alta'
import { exigir } from './soporte/leads'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'

// Agenda (7.07-1, sólo lectura): el calendario en el día. El evento «seleccionados» de la dueña lo ve la asesora invitada y no un tercero; la tarea
// de la asesora la ve ella en su día y la dueña, sólo con «Ver la de todos». `?de=todos` sin permiso no rompe ni dibuja el interruptor.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let eventoId = ''
let tareaId = ''
const rotulo = (proyecto: string) => `Agenda e2e ${proyecto}`

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  const duena = await idDePersona(t.personas.duena)
  const berta = await idDePersona(t.personas.berta)
  const ahora = new Date().toISOString()

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

test.afterAll(async () => {
  await admin().from('eventos').delete().eq('id', eventoId)
  await admin().from('tareas').delete().eq('id', tareaId)
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
