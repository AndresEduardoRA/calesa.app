// Lo que el recorrido del cierre de la Fase 5 (`e2e/configuracion-flujos-recorrido.spec.ts`) arma por la pantalla y mira o limpia en la base del Supabase
// LOCAL. El origen se crea por la pantalla: se lo encuentra por su nombre.
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { masAccionesDe, menuDe } from './lista-de-catalogo'
import { borrarOrigenes } from './origenes'
import { literal, sql } from './sql'
import { borrarVehiculosDe } from './vehiculos'

// Las fases del flujo del origen con ese nombre, como subconsulta.
export const fasesDelOrigen = (origen: string): string =>
  `(select f.id from public.fases f join public.flujos fl on fl.id = f.flujo_id join public.origenes o on o.id = fl.origen_id
     where o.nombre = ${literal(origen)})`

export const idDeFase = (origen: string, nombre: string): string =>
  sql(
    `select id from public.fases where nombre = ${literal(nombre)} and id in ${fasesDelOrigen(origen)}`,
  )

// Lo que deja una corrida (también una que cayó a medias): la espera de repuestos que apunta a una fase del origen, su historial, sus vehículos y el origen.
export async function limpiarRecorrido(origen: string): Promise<void> {
  sql(`delete from public.fases_requisitos where espera_fase_id in ${fasesDelOrigen(origen)}`)
  sql(
    `delete from public.historial_fases where flujo_id in (select fl.id from public.flujos fl join public.origenes o on o.id = fl.origen_id
       where o.nombre = ${literal(origen)})`,
  )
  const clave = sql(`select clave from public.origenes where nombre = ${literal(origen)}`)
  if (clave !== '') {
    await borrarVehiculosDe([clave])
    await borrarOrigenes([clave])
  }
}

// La regla «Esperas» de un flujo: 'true', 'false' o `null` (sin fila).
export function leerEsperas(flujo: string): string | null {
  const activa = sql(
    `select activa::text from public.flujos_reglas where flujo_id = '${flujo}' and regla = 'esperas'`,
  )
  return activa === '' ? null : activa
}

export function fijarEsperas(flujo: string, activa: string | null): void {
  sql(
    activa === null
      ? `delete from public.flujos_reglas where flujo_id = '${flujo}' and regla = 'esperas'`
      : `insert into public.flujos_reglas (flujo_id, regla, activa) values ('${flujo}', 'esperas', ${activa})
           on conflict (flujo_id, regla) do update set activa = excluded.activa`,
  )
}

// Una consulta como esa persona (sus claims y el rol `authenticated`), como lo haría la pantalla de mover de la Fase 6: devuelve la última línea.
export function comoPersona(correo: string, consulta: string): string {
  const salida = sql(`begin;
    select set_config('request.jwt.claim.sub', (select id::text from auth.users where email = ${literal(correo)}), true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    ${consulta};
    commit;`)
  return salida.split('\n').at(-1) ?? ''
}

export const nombresDeFases = (page: Page): Locator => page.locator('[data-abre-resumen]')

export async function crearFase(
  page: Page,
  nombre: string,
  tipo: 'Intermedia' | 'Inicial' | 'Final',
): Promise<void> {
  await page.getByRole('button', { name: 'Nueva fase' }).click()
  const modal = page.getByRole('dialog', { name: 'Nueva fase' })
  await modal.getByLabel('Nombre').fill(nombre)
  await modal.getByLabel(tipo, { exact: false }).check()
  await modal.getByRole('button', { name: 'Crear fase' }).click()
  await expect(modal).toBeHidden()
}

export async function inspectorDe(page: Page, url: string, nombre: string): Promise<Locator> {
  await page.goto(url)
  const inspector = page.getByRole('dialog').filter({ hasText: 'Requisitos para entrar' })
  await expect(inspector.getByRole('heading', { name: nombre })).toBeVisible()
  return inspector
}

export async function agregarSalida(
  inspector: Locator,
  destino: string,
  accion: string,
): Promise<void> {
  const formulario = inspector.getByRole('form', { name: 'Agregar salida' })
  await inspector.getByRole('button', { name: 'Agregar salida' }).click()
  await formulario.getByLabel('Fase de destino').selectOption({ label: destino })
  await formulario.getByLabel('Acción').fill(accion)
  await formulario.getByRole('button', { name: 'Agregar salida' }).click()
  await expect(formulario).toBeHidden()
  await expect(inspector.getByText(`${accion} → ${destino}`)).toBeVisible()
}

export async function agregarRequisito(
  inspector: Locator,
  forma: 'Dato' | 'Documento' | 'Espera',
): Promise<Locator> {
  await inspector.getByRole('button', { name: 'Agregar requisito' }).click()
  await inspector
    .getByRole('group', { name: 'Qué requisito agregar' })
    .getByRole('button', { name: forma, exact: true })
    .click()
  const formulario = inspector.getByRole('form', {
    name: `Agregar requisito de ${forma.toLowerCase()}`,
  })
  await expect(formulario).toBeVisible()
  return formulario
}

// Una espera a la fase cuyo texto contiene `fase` (con varios flujos la opción dice «fase · flujo»): devuelve cómo la nombra la lista.
export async function agregarEsperaA(inspector: Locator, fase: string): Promise<string> {
  const espera = await agregarRequisito(inspector, 'Espera')
  const selector = espera.getByLabel('Fase que se espera')
  const valor = await selector.locator('option', { hasText: fase }).getAttribute('value')
  await selector.selectOption(valor ?? '')
  await espera.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(espera).toBeHidden()
  const descripcion = await inspector
    .getByText(new RegExp(`«${fase}»`))
    .first()
    .textContent()
  return descripcion?.trim() ?? ''
}

// «Quitar» un requisito por su descripción, con su confirmación.
export async function quitarRequisito(page: Page, descripcion: string): Promise<void> {
  await masAccionesDe(page, descripcion).click()
  await menuDe(page, descripcion).getByRole('menuitem', { name: 'Quitar' }).click()
  const confirmar = page.getByRole('dialog', { name: `Quitar el requisito «${descripcion}»` })
  await confirmar.getByRole('button', { name: 'Quitar requisito' }).click()
  await expect(confirmar).toBeHidden()
}

// La franja de «Revisar» del flujo del origen, abierta.
export async function franjaAbierta(page: Page, origenId: string): Promise<Locator> {
  await page.goto(`/configuracion/flujos?origen=${origenId}`)
  const franja = page.getByRole('region', { name: 'Revisar el flujo' })
  const resumen = franja.getByRole('button', { name: /^Revisar:/ })
  await expect(resumen).toBeVisible()
  if ((await resumen.getAttribute('aria-expanded')) !== 'true') await resumen.click()
  await expect(resumen).toHaveAttribute('aria-expanded', 'true')
  return franja
}

export const aviso = (franja: Locator, fase: string, texto: string): Locator =>
  franja.getByRole('listitem').filter({ hasText: fase }).filter({ hasText: texto })
