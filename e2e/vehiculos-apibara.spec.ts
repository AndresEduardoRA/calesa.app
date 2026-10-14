import { expect, test, type Locator, type Page } from '@playwright/test'
import { admin } from './soporte/base'
import {
  COPART,
  ENLACE_DE_COPART,
  IAAI,
  desmontarSubasta,
  fallo,
  ficha,
  fijarApibara,
  fotosConOrigen,
  otroCopart,
  prepararSubasta,
  simularApibara,
  vehiculoPorLote,
  type EstadoDeApibara,
  type VehiculoDeSubasta,
} from './soporte/apibara'
import { aLaVista, descartarAviso, entrar } from './soporte/inventario'

// El alta por apibara contra la app compilada y el Supabase local. Ningún test llama a la API
// real: la edge function se intercepta en el navegador y contesta con lo grabado (Copart e IAAI).
// La función verdadera se prueba aparte (`vehiculos-apibara-funcion.spec.ts`). Una sola historia,
// en orden.
test.describe.configure({ mode: 'serial' })

const AUCTION = COPART['auction'] as Record<string, unknown>
const PRICING = COPART['pricing'] as Record<string, unknown>

let duena = ''
let subasta = { id: '', nombre: '' }
let apibaraAntes: EstadoDeApibara
let creado: VehiculoDeSubasta | null = null

test.beforeAll(async ({}, info) => {
  ;({ duena, subasta, apibaraAntes } = await prepararSubasta(info.project.name))
})

test.afterAll(async () => {
  await desmontarSubasta(apibaraAntes)
})

async function abrirAlta(page: Page): Promise<Locator> {
  await page.goto(`/vehiculos?origen=${subasta.id}&panel=nuevo`)
  const panel = page.getByRole('dialog', { name: 'Nuevo vehículo' })
  await expect(panel).toBeVisible()
  return panel
}

async function pegar(panel: Locator, texto: string): Promise<void> {
  await panel.getByLabel('Enlaces, VIN o lotes').fill(texto)
  await panel.getByRole('button', { name: 'Traer datos' }).click()
}

const guardar = (panel: Locator) => panel.getByRole('button', { name: 'Guardar', exact: true })

test('un enlace de Copart llena la ficha, que se edita antes de guardar, y trae las fotos', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await entrar(page, duena)
  const pedidos = await simularApibara(page, (entrada) =>
    entrada === ENLACE_DE_COPART ? ficha(COPART, ENLACE_DE_COPART) : fallo('no_encontrado'),
  )
  const panel = await abrirAlta(page)
  await pegar(panel, ENLACE_DE_COPART)

  // La ficha queda llena y editable; nada se guardó todavía.
  await expect(panel.getByText('Datos traídos de Copart · lote 58540656')).toBeVisible()
  await expect(panel.getByText('Se traen 14 fotos al guardar.')).toBeVisible()
  await expect(panel.getByLabel('Título (obligatorio)')).toHaveValue('2024 FORD BRONCO BIG BEND')
  await expect(panel.getByLabel('Marca', { exact: true })).toHaveValue('FORD')
  await expect(panel.getByLabel('Año', { exact: true })).toHaveValue('2024')
  await expect(panel.getByLabel('VIN', { exact: true })).toHaveValue('3FMCR9B64RRE04601')
  await expect(panel.getByLabel('Lote', { exact: true })).toHaveValue('58540656')
  await expect(panel.getByLabel('Plataforma', { exact: true })).toHaveValue('copart')
  await expect(panel.getByLabel('Enlace de la subasta', { exact: true })).toHaveValue(
    ENLACE_DE_COPART,
  )
  await expect(panel.getByLabel('Color', { exact: true })).toHaveValue('Gray')
  expect(await vehiculoPorLote(subasta.id, '58540656')).toBeNull()
  expect(pedidos.filter((pedido) => pedido.accion === 'ficha')).toEqual([
    { accion: 'ficha', origen: subasta.id, entrada: ENLACE_DE_COPART },
  ])

  // Se corrige un dato y se guarda; las fotos siguen detrás del aviso.
  await panel.getByLabel('Modelo', { exact: true }).fill('BRONCO CORREGIDO')
  await guardar(panel).click()
  await expect(page.getByText(/Vehículo #\d+ creado/)).toBeVisible()
  await expect(page.getByText('Se guardaron las 14 fotos de la subasta.')).toBeVisible({
    timeout: 90_000,
  })

  creado = await vehiculoPorLote(subasta.id, '58540656')
  expect(creado).toMatchObject({
    titulo: '2024 FORD BRONCO BIG BEND',
    vin: '3FMCR9B64RRE04601',
    plataforma: 'copart',
    url_origen: ENLACE_DE_COPART,
    kilometraje: 51776,
    // La fecha y el estado quedan en sus columnas, derivados de la respuesta.
    subasta_en: '2026-10-14T18:00:00+00:00',
    estado_subasta: 'abierta',
    atributos: { color: 'Gray' },
  })
  expect(creado?.apibara_sync_en).not.toBeNull()
  // Y la respuesta entera, lo que el formulario no muestra incluido.
  expect(creado?.apibara_raw?.['lot_number']).toBe('58540656')
  expect(JSON.stringify(creado?.apibara_raw)).toContain('details')

  const fotos = await fotosConOrigen(creado?.id ?? '')
  expect(fotos).toHaveLength(14)
  expect(fotos[0]).toMatchObject({ orden: 1, es_portada: true })
  expect(fotos.filter((foto) => foto.es_portada)).toHaveLength(1)
  expect(fotos.every((foto) => foto.origen_url?.startsWith('https://cs.copart.com/'))).toBe(true)
  // El video no es una foto: queda en la respuesta guardada, no en las fotos.
  expect(fotos.some((foto) => foto.origen_url?.endsWith('.mp4'))).toBe(false)
})

test('varias líneas: resultado por línea, una que falla, otra que ya está y las listas se guardan juntas', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await entrar(page, duena)
  const segundo = otroCopart({
    title: '2019 TEST SEGUNDO',
    lot_number: '66666666',
    vin: '1HGCM82633A004352',
  })
  await simularApibara(page, (entrada) => {
    if (entrada === '45312823') return ficha(IAAI)
    if (entrada === '66666666') return ficha(segundo)
    if (entrada === '58540656') return ficha(COPART)
    return fallo('no_encontrado')
  })
  const panel = await abrirAlta(page)
  await pegar(panel, ['45312823', '11111111', 'hola', '58540656', '66666666'].join('\n'))

  const lista = panel.getByRole('list', { name: 'Resultado por línea' })
  await expect(lista.getByText('2011 LEXUS ES 350')).toBeVisible()
  await expect(lista.getByText('2011 · lote 45312823 · IAAI')).toBeVisible()
  await expect(
    lista.getByText('No hay un vehículo con ese dato en la subasta.', { exact: false }),
  ).toBeVisible()
  await expect(
    lista.getByText('Pega un enlace de la subasta, un VIN de 17 caracteres o un número de lote.'),
  ).toBeVisible()
  // La que ya está en el inventario se ofrece abrir, no se vuelve a dar de alta.
  await expect(lista.getByText('Ya está en el inventario.')).toBeVisible()
  await expect(lista.getByRole('link', { name: 'Abrir' })).toHaveAttribute(
    'href',
    `/vehiculos/${creado?.id ?? ''}`,
  )

  // Una fallida se sigue a mano sin perder lo pegado.
  const fila = lista.getByRole('listitem').filter({ hasText: '11111111' })
  await fila.getByRole('button', { name: 'Seguir a mano' }).click()
  await expect(panel.getByLabel('Lote', { exact: true })).toHaveValue('11111111')

  // Las dos listas se guardan juntas, con su resultado.
  await panel.getByRole('button', { name: 'Guardar 2 sin revisar' }).click()
  await expect(lista.getByText(/Guardada como #\d+/)).toHaveCount(2)
  await expect(page.getByText('Se guardaron las 17 fotos de la subasta.')).toBeVisible({
    timeout: 120_000,
  })
  await expect(page.getByText('Se guardaron las 2 fotos de la subasta.')).toBeVisible({
    timeout: 60_000,
  })

  const lexus = await vehiculoPorLote(subasta.id, '45312823')
  expect(lexus).toMatchObject({ plataforma: 'iaai', estado_subasta: 'abierta' })
  expect(lexus?.subasta_en).toBe('2026-10-28T20:30:00+00:00')
  expect(await fotosConOrigen(lexus?.id ?? '')).toHaveLength(17)
  const otro = await vehiculoPorLote(subasta.id, '66666666')
  expect(otro?.titulo).toBe('2019 TEST SEGUNDO')
  // La repetida y la que falló no entraron.
  expect(await vehiculoPorLote(subasta.id, '11111111')).toBeNull()
})

test('con apibara apagada el alta sigue a mano', async ({ page }) => {
  await fijarApibara(false)
  await entrar(page, duena)
  const panel = await abrirAlta(page)
  await expect(
    panel.getByText('La consulta de subastas está apagada: carga el vehículo a mano.'),
  ).toBeVisible()
  await expect(panel.getByLabel('Enlaces, VIN o lotes')).toHaveCount(0)
  await expect(panel.getByRole('link', { name: 'Ir a Integraciones' })).toHaveAttribute(
    'href',
    '/configuracion/empresa?seccion=integraciones',
  )

  await panel.getByLabel('Título (obligatorio)').fill('Cargado a mano, sin apibara')
  await panel.getByLabel('Lote', { exact: true }).fill('99999999')
  await guardar(panel).click()
  await expect(page.getByText(/Vehículo #\d+ creado/)).toBeVisible()
  const hecho = await vehiculoPorLote(subasta.id, '99999999')
  expect(hecho).toMatchObject({ titulo: 'Cargado a mano, sin apibara', estado_subasta: null })
  expect(hecho?.apibara_raw).toBeNull()
  expect(hecho?.apibara_sync_en).toBeNull()
  await fijarApibara(true)
})

test('cuota agotada: se dice claro, no se reintenta y se sigue a mano sin perder lo pegado', async ({
  page,
}) => {
  await entrar(page, duena)
  await simularApibara(page, () => fallo('cuota'))
  const panel = await abrirAlta(page)
  await pegar(panel, ENLACE_DE_COPART)

  const lista = panel.getByRole('list', { name: 'Resultado por línea' })
  await expect(
    lista.getByText('Se agotó la cuota de consultas de este período. Puedes seguir a mano.'),
  ).toBeVisible()
  // Reintentar sólo gastaría otra consulta.
  await expect(lista.getByRole('button', { name: 'Reintentar' })).toHaveCount(0)
  await expect(lista.getByRole('link', { name: 'Ir a Integraciones' })).toBeVisible()

  await lista.getByRole('button', { name: 'Seguir a mano' }).click()
  await expect(panel.getByLabel('Enlace de la subasta', { exact: true })).toHaveValue(
    ENLACE_DE_COPART,
  )
  await expect(panel.getByLabel('Plataforma', { exact: true })).toHaveValue('copart')
  await panel.getByLabel('Título (obligatorio)').fill('Bronco cargada a mano tras la cuota')
  await guardar(panel).click()
  await expect(page.getByText(/Vehículo #\d+ creado/)).toBeVisible()
  const { data } = await admin()
    .from('vehiculos')
    .select('titulo, url_origen, apibara_raw')
    .eq('titulo', 'Bronco cargada a mano tras la cuota')
    .single<{ titulo: string; url_origen: string; apibara_raw: unknown }>()
  expect(data).toEqual({
    titulo: 'Bronco cargada a mano tras la cuota',
    url_origen: ENLACE_DE_COPART,
    apibara_raw: null,
  })
})

test('un corte del momento se reintenta; una clave rechazada lleva a Integraciones', async ({
  page,
}) => {
  await entrar(page, duena)
  let intentos = 0
  const otroLote = otroCopart({
    title: '2020 TEST REINTENTO',
    lot_number: '77777777',
    vin: '1FTFW1ET5DFC10312',
  })
  await simularApibara(page, (entrada) => {
    if (entrada === '77777777') {
      intentos += 1
      return intentos === 1 ? fallo('tiempo') : ficha(otroLote)
    }
    return fallo('clave_invalida')
  })
  const panel = await abrirAlta(page)
  await pegar(panel, '77777777')
  const lista = panel.getByRole('list', { name: 'Resultado por línea' })
  await expect(
    lista.getByText('La consulta tardó demasiado en responder. Vuelve a intentar o sigue a mano.'),
  ).toBeVisible()
  await lista.getByRole('button', { name: 'Reintentar' }).click()
  // Una sola línea y bien: llena la ficha.
  await expect(panel.getByLabel('Título (obligatorio)')).toHaveValue('2020 TEST REINTENTO')
  expect(intentos).toBe(2)

  await pegar(panel, '88888888')
  await expect(
    lista.getByText(
      'La clave guardada para consultar subastas fue rechazada. Puedes seguir a mano.',
    ),
  ).toBeVisible()
  await expect(lista.getByRole('button', { name: 'Reintentar' })).toHaveCount(0)
  await expect(lista.getByRole('link', { name: 'Ir a Integraciones' })).toBeVisible()
})

test('refrescar desde la ficha actualiza fecha, estado y puja, y conserva lo que la persona editó', async ({
  page,
}) => {
  test.skip(creado === null, 'Depende del alta por enlace.')
  const id = creado?.id ?? ''
  // Alguien corrigió el título a mano; la API, además, lo cambia.
  await admin().from('vehiculos').update({ titulo: 'Editado a mano' }).eq('id', id)
  await entrar(page, duena)
  const pedidos = await simularApibara(page, () =>
    ficha(
      {
        ...COPART,
        title: '2024 FORD BRONCO ACTUALIZADO',
        auction: { ...AUCTION, outcome_status: 'Sold' },
        pricing: { ...PRICING, current_bid_usd: 4100 },
      },
      ENLACE_DE_COPART,
    ),
  )
  await page.goto(`/vehiculos/${id}`)
  const bloque = page.getByRole('region', { name: 'Subasta' })
  await expect(bloque.getByText('Abierta')).toBeVisible()
  await expect(bloque.getByText('Puja actual')).toBeVisible()

  await bloque.getByRole('button', { name: 'Refrescar' }).click()
  await expect(
    page.getByText('Subasta actualizada. Se conservó lo que editaste: Título.'),
  ).toBeVisible()
  await expect(bloque.getByText('Vendida')).toBeVisible()
  // Se preguntó por el enlace del vehículo.
  expect(pedidos).toEqual([{ accion: 'ficha', origen: subasta.id, entrada: ENLACE_DE_COPART }])

  const despues = await vehiculoPorLote(subasta.id, '58540656')
  expect(despues).toMatchObject({ titulo: 'Editado a mano', estado_subasta: 'vendida' })
  expect(
    (despues?.apibara_raw?.['pricing'] as Record<string, unknown> | undefined)?.['current_bid_usd'],
  ).toBe(4100)
  await descartarAviso(page, /Subasta actualizada/)
  await expect(aLaVista(page.getByText('Editado a mano').first())).toBeVisible()
})
