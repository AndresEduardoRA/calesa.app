import type { Page } from '@playwright/test'
import { formatearPorcentaje } from '../src/shared/lib/formato'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  asesoraDelToken,
  codigoDelToken,
  limpiarFase8,
  prepararFase8,
  tokenDe,
  type AsesoraDelRecorrido,
  type TerrenoDeLaFase8,
} from './soporte/fase-8-recorrido'
import { sesionDe } from './soporte/leads-alta'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead } from './soporte/leads-ficha'
import { CON_ESTA_CLAVE, dialogoDeOtorgar, seccionPortal } from './soporte/leads-portal'
import { cookieDelPortal, ipAlAzar, pedir } from './soporte/portal-api'
import { REPUESTO_DE_LA_ESPERA } from './soporte/repuestos-espera'
import { sql } from './soporte/sql'
import { guiaPublica, pedirComoVisitante } from './soporte/web-publica'

// El recorrido del «Terminado cuando» de la Fase 8 (8.14-1), en los dos proyectos: (R1) un visitante anónimo llama `web.solicitar_asesor` con la
// clave pública y le toca una de las dos asesoras de la rueda (X); (R2) X confirma el turno en Inicio con «Contacté», en ≤ 2 toques; (R3) la tasa de
// contacto de X cambia en el tablero de la cola y la de la otra (Y) no; (R4) X apaga su disponibilidad en /perfil y el visitante que vuelve igual la
// recibe (sólo el pegajoso puede dársela), mientras uno nuevo va a Y; (R5) con Y también apagada, un visitante nuevo recibe el respaldo; (R6) el
// cliente entra al portal por `api/portal` con el código que dio la ficha del lead; (R7) una guía publicada sale en `web.guias` y deja su etiqueta en
// la cola de revalidar; (R8) un repuesto que llega a «Recibido» cumple la espera del vehículo en «En taller». El detalle de cada pieza lo prueban sus
// specs y `supabase/tests/` (la tabla de criterios de la fase, `docs/PLAN.md`).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaFase8 | undefined
// X recibe el primer turno; Y es la otra.
let x: AsesoraDelRecorrido | undefined
let y: AsesoraDelRecorrido | undefined

const terreno = () => {
  if (!t) throw new Error('Falta el terreno del recorrido.')
  return t
}
const laX = () => {
  if (!x || !y) throw new Error('R1 no eligió asesora.')
  return x
}
const laY = () => {
  if (!x || !y) throw new Error('R1 no eligió asesora.')
  return y
}

test.beforeAll(async ({}, info) => {
  t = await prepararFase8(info.project.name)
})

test.afterAll(async () => {
  await limpiarFase8(t)
})

async function apagarLaDisponibilidad(page: Page, asesora: AsesoraDelRecorrido) {
  await entrar(page, asesora.email, { fresco: true })
  await page.goto('/perfil')
  await expect(page.getByRole('heading', { name: 'Mi perfil', level: 1 })).toBeVisible()
  const interruptor = page.getByRole('switch', { name: 'Disponible para recibir turnos' })
  await expect(interruptor).toBeChecked()
  await interruptor.click()
  await expect(interruptor).not.toBeChecked()
  await expect
    .poll(() =>
      sql(
        `select disponible::text from public.cola_web_asesores where usuario_id = '${asesora.id}'`,
      ),
    )
    .toBe('false')
}

test('E2E R1 un visitante anónimo pide un asesor y le toca una de las dos', async () => {
  const { aida, bruna, proyecto } = terreno()
  const respuesta = await pedirComoVisitante(tokenDe(proyecto, 1))
  expect(respuesta.esRespaldo).toBe(false)
  expect([aida.nombre, bruna.nombre]).toContain(respuesta.nombre)
  const quien = asesoraDelToken(tokenDe(proyecto, 1))
  expect([aida.id, bruna.id]).toContain(quien)
  ;[x, y] = quien === aida.id ? [aida, bruna] : [bruna, aida]
  expect(respuesta.nombre).toBe(x.nombre)
})

test('E2E R2 la asesora confirma el turno en dos toques desde Inicio', async ({ page }) => {
  const token = tokenDe(terreno().proyecto, 1)
  const codigo = codigoDelToken(token)
  await entrar(page, laX().email, { fresco: true })
  await page.goto('/')
  const tarjeta = page
    .getByRole('region', { name: 'Turnos de la web sin confirmar' })
    .getByRole('article', { name: `Turno ${codigo}` })
  await expect(tarjeta).toBeVisible()
  let toques = 0
  await tarjeta.getByRole('button', { name: 'Contacté' }).click()
  toques += 1
  await expect(tarjeta).toHaveCount(0)
  expect(toques).toBeLessThanOrEqual(2)
  expect(
    sql(
      `select estado || ':' || senal_contacto from public.solicitudes_contacto_web where token_visitante = '${token}'`,
    ),
  ).toBe('contactada:manual')
})

// @sin-celular: el tablero de la cola es Configuración y la persona pidió no probarla en celular (2026-11-08)
test('E2E R3 el tablero de la cola muestra la tasa de contacto nueva', async ({ page }) => {
  await entrar(page, terreno().personas.duena, { fresco: true })
  await page.goto('/configuracion/cola-web')
  await expect(page.getByRole('heading', { name: 'Cola web', level: 1 })).toBeVisible()
  const rueda = page.getByRole('region', { name: 'En la rueda' })
  const fila = (nombre: string) => rueda.locator('li').filter({ hasText: nombre })
  // Una asignada sembrada más la del R1, y la del R1 contactada: 1 de 2. La otra sigue en 0 de 1.
  await expect(fila(laX().nombre)).toContainText(`Contacta el ${formatearPorcentaje(0.5)}`)
  await expect(fila(laY().nombre)).toContainText(`Contacta el ${formatearPorcentaje(0)}`)
})

test('E2E R4 el visitante que vuelve dentro del plazo recibe a la misma asesora', async ({
  page,
}) => {
  const { proyecto } = terreno()
  await apagarLaDisponibilidad(page, laX())
  // La ruleta ya no la elige (no está disponible): sólo el pegajoso puede devolverla.
  const vuelve = await pedirComoVisitante(tokenDe(proyecto, 1))
  expect(vuelve).toEqual({ esRespaldo: false, nombre: laX().nombre })
  expect(asesoraDelToken(tokenDe(proyecto, 1))).toBe(laX().id)
  // Un visitante nuevo va a la otra: la ruleta sigue andando.
  const nuevo = await pedirComoVisitante(tokenDe(proyecto, 2))
  expect(nuevo).toEqual({ esRespaldo: false, nombre: laY().nombre })
})

test('E2E R5 con todas sin disponibilidad el visitante recibe el respaldo', async ({ page }) => {
  const { proyecto } = terreno()
  await apagarLaDisponibilidad(page, laY())
  const respuesta = await pedirComoVisitante(tokenDe(proyecto, 3))
  expect(respuesta).toEqual({ esRespaldo: true, nombre: null })
  expect(asesoraDelToken(tokenDe(proyecto, 3))).toBe('')
})

test('E2E R6 el cliente entra al portal por api/portal con el código que dio la ficha', async ({
  page,
  playwright,
  baseURL,
}) => {
  const tr = terreno()
  const base = baseURL ?? ''
  const lead = await nuevoLead({
    corto: `Fase 8 Portal ${tr.proyecto}`,
    telefono: completoCon(tr, nacional()),
    deQuien: tr.pia.email,
  })
  await entrar(page, tr.pia.email, { fresco: true })
  await irAFicha(page, lead.id, '?seccion=portal')
  await seccionPortal(page).getByRole('button', { name: 'Dar acceso' }).click()
  const clave = `Recorrido-${tr.proyecto}-8`
  await dialogoDeOtorgar(page).getByLabel('Clave temporal').fill(clave)
  await dialogoDeOtorgar(page).getByRole('button', { name: CON_ESTA_CLAVE }).click()
  const listo = page.getByRole('dialog', { name: `${lead.nombre} ya tiene acceso al portal` })
  const codigo = ((await listo.getByLabel(/^Código:/).textContent()) ?? '').trim()
  expect(codigo).not.toBe('')

  const ingreso = await pedir(playwright, base, '/api/portal/ingresar', {
    metodo: 'POST',
    ip: ipAlAzar(),
    origen: base,
    cuerpo: { codigo, clave },
  })
  expect(ingreso.status).toBe(200)
  const cookie = cookieDelPortal(ingreso)?.valor ?? ''
  expect(cookie).not.toBe('')
  const estado = await pedir(playwright, base, '/api/portal/estado', { cookie })
  expect(estado.status).toBe(200)
  expect(Array.isArray((JSON.parse(estado.texto) as { vehiculos?: unknown }).vehiculos)).toBe(true)
})

test('E2E R7 la guía publicada sale en web.guias y deja su etiqueta por revalidar', async () => {
  const tr = terreno()
  sql(`delete from interno.web_revalidar_pendiente where etiqueta = 'guias'`)
  expect(await guiaPublica(tr.guia.slug)).toBeNull()
  // La dueña la publica con su sesión, como la pantalla: el trigger exige `web.guias.publicar`.
  const sesion = await sesionDe(tr.personas.duena, CONTRASENA)
  const { data, error } = await sesion
    .from('web_guias')
    .update({ publicada_en: new Date(Date.now() - 60_000).toISOString() })
    .eq('slug', tr.guia.slug)
    .select('slug')
  expect(error).toBeNull()
  expect(data).toHaveLength(1)
  expect(await guiaPublica(tr.guia.slug)).toBe(tr.guia.titulo)
  // La web pública está apagada: el job de revalidar no vacía la cola.
  expect(
    sql(`select exists (select 1 from interno.web_revalidar_pendiente where etiqueta = 'guias')`),
  ).toBe('t')
})

test('E2E R8 el repuesto que llega a «Recibido» cumple la espera del vehículo en «En taller»', async ({
  page,
}) => {
  const { espera, personas } = terreno()
  await entrar(page, personas.duena, { fresco: true })
  await page.goto(`/logistica/vehiculo/${espera.vehiculo}`)
  await page.getByRole('button', { name: 'Elegir el destino «Listo»' }).click()
  await expect(page.locator('[data-motivo-del-boton]')).toHaveText('Falta: Esperar a «Recibido».')
  await expect(page.getByRole('button', { name: 'Mover a «Listo»' })).toBeDisabled()

  await page.goto(
    `/repuestos?vista=cadena&proyecto=${espera.proyectoDeRepuestos}&fase=${espera.transito}`,
  )
  const columna = page.getByRole('region', { name: 'En tránsito: 1 ítem' })
  await columna.getByRole('link', { name: REPUESTO_DE_LA_ESPERA }).click()
  const panel = page.getByRole('dialog', { name: 'Repuesto' })
  await expect(panel.getByRole('heading', { name: REPUESTO_DE_LA_ESPERA })).toBeVisible()
  await panel.getByRole('button', { name: 'Elegir el destino «Recibido»' }).click()
  await panel.getByRole('button', { name: 'Recibir' }).click()
  await expect(page.getByText(`${REPUESTO_DE_LA_ESPERA} pasó a «Recibido».`)).toBeVisible()

  await page.goto(`/logistica/vehiculo/${espera.vehiculo}`)
  await page.getByRole('button', { name: 'Elegir el destino «Listo»' }).click()
  await expect(page.getByText('Cumplido', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mover a «Listo»' })).toBeEnabled()
})
