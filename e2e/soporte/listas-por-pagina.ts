// Lo que usan los e2e de «ítems por página» (9g): la preferencia de la persona en la base, el selector de un listado y
// la URL. Todo en el Supabase LOCAL; la preferencia es la fila `listas.por_pagina` de `preferencias_usuario`.
import { expect, type Locator, type Page } from '@playwright/test'
import { admin } from './base'
import { aLaVista } from './inventario'
import { exigir, idDe } from './leads'

const CLAVE = 'listas.por_pagina'

// Fija (o borra, con `null`) la preferencia de una persona, sin pasar por la pantalla.
export async function fijarPreferencia(email: string, valor: number | null): Promise<void> {
  const usuario = await idDe(email)
  const tabla = admin().from('preferencias_usuario')
  const { error } =
    valor === null
      ? await tabla.delete().eq('usuario_id', usuario).eq('clave', CLAVE)
      : await tabla.upsert({ usuario_id: usuario, clave: CLAVE, valor })
  exigir(error, `fijar la preferencia de ${email}`)
}

// Lo que quedó guardado en la cuenta (nulo = nunca eligió).
export async function preferenciaDe(email: string): Promise<number | null> {
  const { data, error } = await admin()
    .from('preferencias_usuario')
    .select('valor')
    .eq('usuario_id', await idDe(email))
    .eq('clave', CLAVE)
    .maybeSingle<{ valor: number }>()
  exigir(error, `leer la preferencia de ${email}`)
  return data?.valor ?? null
}

// El selector que se ve (la barra desde `md`, el pie de la lista por debajo: el otro está oculto).
export const selectorDeTamano = (page: Page): Locator =>
  aLaVista(page.getByLabel('Ítems por página'))

export const filasDelListado = (page: Page): Locator =>
  aLaVista(page.locator('tbody tr, li article'))

export const parametrosDe = (page: Page): URLSearchParams => new URL(page.url()).searchParams

// La lista llega pintada por el servidor antes de que React enganche sus controles: un cambio hecho en ese instante se
// pierde (sin ningún pedido). El selector lleva `data-hidratado`, que React pone recién cuando lo enganchó.
export async function esperarHidratado(page: Page): Promise<void> {
  await expect(selectorDeTamano(page)).toHaveAttribute('data-hidratado', 'true')
}

// Elige un tamaño con el mouse o el dedo, ya hidratada la página.
export async function elegirTamano(page: Page, tamano: number): Promise<void> {
  await esperarHidratado(page)
  await selectorDeTamano(page).selectOption(String(tamano))
}

// Qué vista trae el HTML del servidor (cierre 1: una sola, según el ancho de la petición). La tabla es un `<table>`; cada
// tarjeta, un `<article>` dentro de su `<li>` (`tbody tr, li article` son las filas de toda lista).
export const vistasDelHtml = (html: string): { tabla: boolean; tarjetas: boolean } => ({
  tabla: html.includes('<table'),
  tarjetas: html.includes('<article'),
})
