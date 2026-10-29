// El vigilante de los guardados de la hoja de cotizar (paso 4.13-3b): cada POST de la Server Action de `/cotizaciones/nuevo` (lleva la cabecera `next-action`), con lo que
// mandó, y lo que le pasa al próximo: perder su respuesta (llega al servidor y la respuesta no vuelve, 4-21) o cambiarle el cuerpo. Y lo que se mira en la base.
import { expect, type Locator, type Page } from '@playwright/test'
import { CONTRASENA } from './alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './cotizar-formula'
import { borrarLeadsDePrueba, crearLead } from './leads'
import { telefonoAlAzar } from './leads-alta'
import { literal, sql } from './sql'

export type PedidoDeGuardadoVisto = {
  intento: string
  origenId: string
  leadId: string
  vehiculoId: string | null
  abierta: string
  entradas: {
    inputs: Record<string, number>
    banderas: Record<string, boolean>
    overrides: Record<string, number>
    variante?: string
  }
  modoTc: string | null
  conLaAbierta: boolean
}

export type VigilanteDeGuardados = {
  pedidos: PedidoDeGuardadoVisto[]
  // El próximo guardado llega al servidor (que lo guarda) y su respuesta se pierde: el navegador ve un error de red.
  perderLaProxima: () => void
  // El próximo guardado sale con el cuerpo que devuelva `cambio`.
  reescribirLaProxima: (cambio: (p: PedidoDeGuardadoVisto) => PedidoDeGuardadoVisto) => void
}

const esLaHoja = (url: URL) => url.pathname === '/cotizaciones/nuevo'

export async function vigilarGuardados(page: Page): Promise<VigilanteDeGuardados> {
  const pedidos: PedidoDeGuardadoVisto[] = []
  let perder = false
  let reescribir: ((p: PedidoDeGuardadoVisto) => PedidoDeGuardadoVisto) | null = null
  await page.route(esLaHoja, async (ruta) => {
    const pedido = ruta.request()
    if (pedido.method() !== 'POST' || (await pedido.headerValue('next-action')) === null) {
      await ruta.fallback()
      return
    }
    // El cuerpo de una action con un objeto de argumento es el arreglo de sus argumentos en JSON.
    const [visto] = JSON.parse(pedido.postData() ?? '[]') as [PedidoDeGuardadoVisto]
    const cambio = reescribir
    reescribir = null
    const enviado = cambio ? cambio(visto) : visto
    pedidos.push(enviado)
    if (perder) {
      perder = false
      await ruta.fetch(cambio ? { postData: JSON.stringify([enviado]) } : {})
      await ruta.abort('failed')
      return
    }
    await ruta.fallback(cambio ? { postData: JSON.stringify([enviado]) } : {})
  })
  return {
    pedidos,
    perderLaProxima: () => {
      perder = true
    },
    reescribirLaProxima: (c) => {
      reescribir = c
    },
  }
}

// Lo que quedó en la base con ese id (el intento es el id de la cotización).
export function cotizacionGuardada(id: string): {
  filas: number
  creadoPor: string
  formulaId: string
  totalBase: string
  // El modo de tipo de cambio con que se calculó (vacío si no se mandó) y «Ver total Bs» (4.13-4b).
  modoTc: string
  verTotalBs: boolean
} {
  const salida = sql(
    `select count(*) over (), creado_por, formula_id, total_base, coalesce(modo_tc, ''), ver_total_bs from public.cotizaciones where id = ${literal(id)}::uuid`,
  )
  const [
    filas = '0',
    creadoPor = '',
    formulaId = '',
    totalBase = '',
    modoTc = '',
    verTotalBs = '',
  ] = salida.split('|')
  return {
    filas: Number(filas),
    creadoPor,
    formulaId,
    totalBase,
    modoTc,
    verTotalBs: verTotalBs === 't',
  }
}

export const formulaVigente = (origenId: string): string =>
  sql(
    `select id from public.formulas where origen_id = ${literal(origenId)}::uuid and estado = 'publicada'`,
  )

let vehiculoObligatorioDeAntes: string | null = null

// Lo que preparan los specs del guardado: un origen con la fórmula de prueba, una dueña y un lead suyo. `proyecto` va en los nombres: dos proyectos no se pisan.
export async function prepararGuardado(
  proyecto: string,
  resto: string,
  dosModos = false,
): Promise<{ origen: { id: string; nombre: string }; duena: string; lead: string }> {
  borrarOrigenesDeCotizar()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  // El ajuste de la empresa pide un vehículo para guardar (por defecto, sí): estos specs guardan sin vehículo, y el de antes vuelve al limpiar.
  vehiculoObligatorioDeAntes ??= sql(
    'select vehiculo_obligatorio_al_cotizar from public.ajustes_empresa',
  )
  sql('update public.ajustes_empresa set vehiculo_obligatorio_al_cotizar = false')
  const origen = await crearOrigenDeCotizar(proyecto, resto, true, dosModos)
  const duena = correoDePrueba(`duena-${resto}-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Gala Guarda' })
  const lead = await crearLead({
    nombre: `cotizar ${resto} ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  return { origen, duena, lead }
}

export async function limpiarGuardado(): Promise<void> {
  if (vehiculoObligatorioDeAntes !== null) {
    sql(
      `update public.ajustes_empresa set vehiculo_obligatorio_al_cotizar = ${vehiculoObligatorioDeAntes === 't'}`,
    )
    vehiculoObligatorioDeAntes = null
  }
  borrarOrigenesDeCotizar()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
}

export const celdaDeLaHoja = (page: Page, nodo: string): Locator =>
  page.locator(`[data-nodo="${nodo}"]`)

// Abre la celda de un nodo y escribe, sin confirmar (la celda sólo abre cuando la página terminó de hidratar: se insiste hasta que abre).
export async function escribirEnLaHoja(page: Page, nodo: string, texto: string): Promise<Locator> {
  const entrada = celdaDeLaHoja(page, nodo).locator('input')
  await expect(async () => {
    if (!(await entrada.isVisible())) {
      await celdaDeLaHoja(page, nodo).locator('[data-parada="0"]').click()
    }
    await expect(entrada).toBeVisible({ timeout: 500 })
  }).toPass()
  await entrada.fill(texto)
  return entrada
}

// Escribe y confirma con Enter, como una persona.
export async function tipearEnLaHoja(page: Page, nodo: string, texto: string): Promise<void> {
  const entrada = await escribirEnLaHoja(page, nodo, texto)
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
}

export const totalDeLaHoja = (page: Page): Locator => page.locator('[data-total]')
export const tarjetaGuardada = (page: Page): Locator => page.locator('[data-cotizacion-guardada]')
export const guardarConElAtajo = (page: Page): Promise<void> =>
  page.keyboard.press('ControlOrMeta+s')
