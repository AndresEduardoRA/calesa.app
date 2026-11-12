import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { esMovil, otraPersona } from './soporte/inventario'
import { limpiarChat, prepararChat, sembrarMensaje, type TerrenoDelChat } from './soporte/chat'
import { sql } from './soporte/sql'

// El chat (7.09-1): la lista de conversaciones. Las directas se siembran por SQL (la lista y su señal son lo que se prueba): Ana ve
// a la dueña arriba y a Luis abajo, cada una con su «1 sin leer»; un mensaje nuevo de Luis llega sin recargar (Realtime es señal y la
// lista se relee), sube su fila y su insignia pasa a 2. Abrir una conversación la selecciona por `?c=`; en el celular la lista
// y el hilo son dos pantallas y «Volver a la lista» regresa. Sin `chat.participar` la pantalla lo dice.
// 7.09-2: iniciar una directa buscando a la persona (la otra la ve sin recargar, la que ya existe no se duplica) y un grupo que se
// silencia y se deja.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelChat

test.beforeAll(async ({}, info) => {
  t = await prepararChat(info.project.name)
})

test.afterAll(async () => {
  await limpiarChat()
})

const lista = (page: Page) => page.getByRole('navigation', { name: 'Conversaciones' })
const fila = (page: Page, nombre: string) =>
  lista(page).getByRole('link', { name: new RegExp(nombre) })

test('un mensaje nuevo llega a la lista sin recargar, con su no leído, y la fila sube', async ({
  page,
}) => {
  await entrar(page, t.ana.email)
  await page.goto('/chat')
  await expect(page.getByRole('heading', { name: 'Chat', level: 1 })).toBeVisible()

  // La dueña escribió después que Luis: va arriba, y cada una trae su «1 sin leer».
  await expect(lista(page).getByRole('link')).toHaveCount(2)
  await expect(lista(page).getByRole('link').first()).toContainText(t.duena.nombre)
  await expect(fila(page, t.duena.nombre).getByRole('img', { name: '1 sin leer' })).toBeVisible()
  await expect(fila(page, t.luis.nombre).getByRole('img', { name: '1 sin leer' })).toBeVisible()

  sembrarMensaje(t.conLuis, t.luis.id, 'Te mando la guía en un rato')

  await expect(fila(page, t.luis.nombre).getByRole('img', { name: '2 sin leer' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(lista(page).getByRole('link').first()).toContainText(t.luis.nombre)
})

test('abrir una conversación la selecciona por la URL y, en el celular, «Volver a la lista» regresa', async ({
  page,
}) => {
  await entrar(page, t.ana.email)
  await page.goto('/chat')
  await fila(page, t.duena.nombre).click()

  await expect(page).toHaveURL(new RegExp(`/chat\\?c=${t.conLaDuena}`))
  await expect(page.getByRole('heading', { name: t.duena.nombre, level: 2 })).toBeVisible()

  const volver = page.getByRole('link', { name: 'Volver a la lista' })
  if (esMovil(page)) {
    await expect(lista(page)).toBeHidden()
    await volver.click()
    await expect(page).toHaveURL(/\/chat$/)
    await expect(lista(page)).toBeVisible()
  } else {
    await expect(lista(page)).toBeVisible()
    await expect(fila(page, t.duena.nombre)).toHaveAttribute('aria-current', 'page')
    await expect(volver).toBeHidden()
  }
})

test('una conversación que no es mía dice «ya no es tuya» y vuelve a la lista', async ({
  page,
}) => {
  await entrar(page, t.ana.email)
  // La directa de la dueña con Luis no existe: es un GUID válido que no es de Ana.
  await page.goto('/chat?c=00000000-0000-4000-8000-000000000000')
  await expect(page.getByText('Esta conversación ya no es tuya')).toBeVisible()
  await page.getByRole('link', { name: 'Volver a la lista' }).first().click()
  await expect(page).toHaveURL(/\/chat$/)
})

test('quien no tiene chat.participar ve que no tiene permiso, sin menú ni lista', async ({
  browser,
  page,
}) => {
  await entrar(page, t.ana.email)
  await page.goto('/chat')
  const sofia = await otraPersona(browser, page)
  await entrar(sofia, t.sofia.email)
  await sofia.goto('/chat')
  await expect(sofia.getByText('No tienes permiso para usar el chat')).toBeVisible()
  await expect(lista(sofia)).toHaveCount(0)
  await sofia.context().close()
})

test('iniciar una directa buscando a la persona: aparece en la lista de la otra y la que ya existe no se duplica', async ({
  browser,
  page,
}) => {
  await entrar(page, t.ana.email)
  await page.goto('/chat')
  // Marta ya está en su lista, vacía: la directa que Ana abra le llega sin recargar.
  const marta = await otraPersona(browser, page)
  await entrar(marta, t.marta.email)
  await marta.goto('/chat')
  await expect(marta.getByText('Aún no tienes conversaciones')).toBeVisible()

  await page.getByRole('button', { name: 'Nueva conversación' }).click()
  await page.getByRole('menuitem', { name: 'Mensaje directo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nueva conversación' })
  await expect(dialogo.getByText('Escribe al menos 3 letras.')).toBeVisible()

  // Sofía no puede usar el chat: la base lo rechaza y el modal lo dice, sin cambiar de pantalla.
  await dialogo.getByRole('searchbox').fill('Sofía Chat')
  await dialogo.getByRole('button', { name: t.sofia.nombre }).click()
  await expect(dialogo.getByText('Esa persona no puede usar el chat.')).toBeVisible()
  await expect(page).toHaveURL(/panel=nueva/)

  await dialogo.getByRole('searchbox').fill(t.marta.nombre)
  await dialogo.getByRole('button', { name: t.marta.nombre }).click()
  await expect(page).toHaveURL(/\/chat\?c=[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: t.marta.nombre, level: 2 })).toBeVisible()
  await expect(dialogo).toBeHidden()

  await expect(fila(marta, t.ana.nombre)).toBeVisible({ timeout: 20_000 })

  // La directa de Ana con Luis ya existe: abrirla otra vez lleva a esa y no crea otra.
  if (esMovil(page)) {
    await page.getByRole('link', { name: 'Volver a la lista' }).click()
  }
  await page.getByRole('button', { name: 'Nueva conversación' }).click()
  await page.getByRole('menuitem', { name: 'Mensaje directo' }).click()
  await page
    .getByRole('dialog', { name: 'Nueva conversación' })
    .getByRole('searchbox')
    .fill(t.luis.nombre)
  await page
    .getByRole('dialog', { name: 'Nueva conversación' })
    .getByRole('button', { name: t.luis.nombre })
    .click()
  await expect(page).toHaveURL(new RegExp(`/chat\\?c=${t.conLuis}$`))
  expect(
    sql(
      `select count(*) from public.conversaciones where tipo = 'directa' and par_directo @> array['${t.ana.id}'::uuid, '${t.luis.id}'::uuid]`,
    ),
  ).toBe('1')
  await marta.context().close()
})

test('un grupo nuevo se puede silenciar y dejar', async ({ page }) => {
  await entrar(page, t.ana.email)
  await page.goto('/chat')
  await page.getByRole('button', { name: 'Nueva conversación' }).click()
  await page.getByRole('menuitem', { name: 'Nuevo grupo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nuevo grupo' })
  await dialogo.getByLabel('Nombre del grupo').fill('Grupo de prueba')
  await dialogo.getByRole('searchbox').fill(t.luis.nombre)
  await dialogo.getByRole('button', { name: t.luis.nombre }).click()
  await expect(dialogo.getByRole('button', { name: `Quitar a ${t.luis.nombre}` })).toBeVisible()
  await dialogo.getByRole('button', { name: 'Crear grupo' }).click()

  await expect(page).toHaveURL(/\/chat\?c=[0-9a-f-]{36}$/)
  const idDelGrupo = new URL(page.url()).searchParams.get('c') ?? ''
  await expect(page.getByRole('heading', { name: 'Grupo de prueba', level: 2 })).toBeVisible()

  const menu = page.getByRole('button', { name: 'Más acciones de «Grupo de prueba»' })
  await menu.click()
  await page.getByRole('menuitem', { name: 'Silenciar' }).click()
  await menu.click()
  await expect(page.getByRole('menuitem', { name: 'Dejar de silenciar' })).toBeVisible()
  expect(
    sql(
      `select silenciada from public.conversaciones_miembros where conversacion_id = '${idDelGrupo}' and usuario_id = '${t.ana.id}'`,
    ),
  ).toBe('t')
  await page.keyboard.press('Escape')

  await menu.click()
  await page.getByRole('menuitem', { name: 'Salir del grupo' }).click()
  const confirmar = page.getByRole('dialog', { name: 'Salir del grupo «Grupo de prueba»' })
  await confirmar.getByRole('button', { name: 'Salir' }).click()

  await expect(page).toHaveURL(/\/chat$/)
  await expect(lista(page)).toBeVisible()
  await expect(fila(page, 'Grupo de prueba')).toHaveCount(0)
  expect(
    sql(
      `select usuario_id from public.conversaciones_miembros where conversacion_id = '${idDelGrupo}'`,
    ),
  ).toBe(t.luis.id)
})
