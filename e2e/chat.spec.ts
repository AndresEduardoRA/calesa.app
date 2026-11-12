import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { esMovil, otraPersona } from './soporte/inventario'
import { limpiarChat, prepararChat, sembrarMensaje, type TerrenoDelChat } from './soporte/chat'

// El chat (7.09-1): la lista de conversaciones. Las directas se siembran por SQL (la lista y su señal son lo que se prueba): Ana ve
// a la dueña arriba y a Luis abajo, cada una con su «1 sin leer»; un mensaje nuevo de Luis llega sin recargar (Realtime es señal y la
// lista se relee), sube su fila y su insignia pasa a 2. Abrir una conversación la selecciona por `?c=`; en el celular la lista
// y el hilo son dos pantallas y «Volver a la lista» regresa. Sin `chat.participar` la pantalla lo dice.
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
