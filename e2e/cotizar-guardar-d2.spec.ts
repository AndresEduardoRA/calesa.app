import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { vigilarRecalculos } from './soporte/cotizar'
import { publicarLaVersionSiguiente } from './soporte/cotizar-formula'
import {
  celdaDeLaHoja,
  cotizacionGuardada,
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { literal, sql } from './soporte/sql'

// D2 al guardar (paso 4.13-3b, P2): la hoja se abrió con otra versión de la fórmula o con otro tipo de cambio que los de hoy. El aviso va en el resumen con sus dos salidas:
// «Guardar con la versión N» guarda con la de la hoja; «Usar la versión nueva» la reabre con la vigente y lo tipeado vuelve (el borrador). Y «Recargar» cuando la base
// rechaza la hoja abierta. La abierta se altera en el cuerpo del pedido: Vault no se toca.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''

test.beforeAll(async ({}, info) => {
  ;({ origen, duena, lead } = await prepararGuardado(info.project.name, 'd2'))
})

test.afterAll(async () => {
  await limpiarGuardado()
})

const idDeLaVersion = (version: number) =>
  sql(
    `select id from public.formulas where origen_id = ${literal(origen.id)}::uuid and version = ${String(version)}`,
  )
const versionVigente = () =>
  Number(
    sql(
      `select version from public.formulas where origen_id = ${literal(origen.id)}::uuid and estado = 'publicada'`,
    ),
  )

async function abrir(page: Parameters<typeof entrar>[0]) {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}`)
  await expect(totalDeLaHoja(page)).toBeVisible()
}

test('D2 por fórmula: «Guardar con la versión N» guarda con la versión de la hoja', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await abrir(page)
  const deLaHoja = versionVigente()
  publicarLaVersionSiguiente(origen.id, 7)
  await tipearEnLaHoja(page, 'pub', '100')
  await guardarConElAtajo(page)
  await expect(
    page.getByText('Se publicó una versión nueva de la fórmula mientras cotizabas.'),
  ).toBeVisible()
  await page.getByRole('button', { name: `Guardar con la versión ${String(deLaHoja)}` }).click()
  await expect(tarjetaGuardada(page)).toBeVisible()
  const [d2, conLaN] = guardados.pedidos
  expect(conLaN?.conLaAbierta).toBe(true)
  expect(conLaN?.abierta).toBe(d2?.abierta)
  expect(cotizacionGuardada(conLaN?.intento ?? '').formulaId).toBe(idDeLaVersion(deLaHoja))
})

test('D2 por fórmula: «Usar la versión nueva» reabre la hoja con la vigente y lo tipeado vuelve; el recálculo y el guardado mandan la misma abierta nueva', async ({
  page,
}) => {
  const recalculos = await vigilarRecalculos(page)
  const guardados = await vigilarGuardados(page)
  await abrir(page)
  publicarLaVersionSiguiente(origen.id, 9)
  await tipearEnLaHoja(page, 'pub', '200')
  await guardarConElAtajo(page)
  await page.getByRole('button', { name: 'Usar la versión nueva' }).click()
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('200,00')
  const vieja = guardados.pedidos[0]?.abierta
  await expect.poll(() => recalculos.pedidos.at(-1)?.p_abierta).not.toBe(vieja)
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  const ultimo = guardados.pedidos.at(-1)
  expect(ultimo?.abierta).toBe(recalculos.pedidos.at(-1)?.p_abierta)
  expect(ultimo?.entradas.inputs).toEqual({ pub: 200 })
  expect(cotizacionGuardada(ultimo?.intento ?? '').formulaId).toBe(idDeLaVersion(versionVigente()))
})

test('D2 por tipo de cambio: el aviso no dice cuál, y ofrece las dos salidas', async ({ page }) => {
  await abrir(page)
  const antes = sql(`select valor from public.tipos_cambio where clave = 'oficial'`)
  sql(`update public.tipos_cambio set valor = valor + 0.5 where clave = 'oficial'`)
  try {
    await tipearEnLaHoja(page, 'pub', '300')
    await guardarConElAtajo(page)
    await expect(
      page.getByText('Cambió un tipo de cambio de la hoja mientras cotizabas.'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Usar el de hoy' })).toBeVisible()
    await page.getByRole('button', { name: 'Guardar con el de la hoja' }).click()
    await expect(tarjetaGuardada(page)).toBeVisible()
  } finally {
    sql(`update public.tipos_cambio set valor = ${antes} where clave = 'oficial'`)
  }
})

test('la base rechaza la hoja abierta (firma alterada): «Recargar» la reabre con lo tipeado', async ({
  page,
}) => {
  const recalculos = await vigilarRecalculos(page)
  const guardados = await vigilarGuardados(page)
  await abrir(page)
  await tipearEnLaHoja(page, 'pub', '400')
  await expect.poll(() => recalculos.respuestas.length).toBe(1)
  // El último carácter de la firma (hex) por otro: la base dice `abierta_invalida`.
  guardados.reescribirLaProxima((p) => ({
    ...p,
    abierta: p.abierta.slice(0, -1) + (p.abierta.endsWith('0') ? '1' : '0'),
  }))
  await guardarConElAtajo(page)
  await expect(
    page.getByText('Esta hoja ya no se puede guardar: recárgala. Lo que escribiste vuelve.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Recargar' }).click()
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('400,00')
  expect(cotizacionGuardada(guardados.pedidos[0]?.intento ?? '').filas).toBe(0)
})
