// @sin-celular-archivo: el PDF se arma en el servidor y no depende del ancho, del proyecto ni del tacto
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { crearOrigenDeCotizar, ocultoDeUnaFormulaSembrada } from './soporte/cotizar-formula'
import {
  cambiarElFactorVivo,
  crearVehiculoDePrueba,
  envejecerLaCotizacion,
  guardarPorLaHoja,
  publicarConTablaViva,
} from './soporte/cotizar-guardada'
import { limpiarGuardado, prepararGuardado, tipearEnLaHoja } from './soporte/cotizar-guardar'
import {
  exigirNoDisponible,
  mandarALaPapelera,
  cuentaDelPdf,
  filasSonLoGuardado,
  guardarLaHojaAbierta,
  leerElPdf,
  monedaDelTotal,
  pedirElPdf,
  rutaDelPdfDe,
  snapshotDe,
  usd,
} from './soporte/cotizar-pdf'
import {
  abrirLaHoja,
  alDia,
  anotar,
  cotizarEnLaSubasta,
  urlDeLaSubasta,
} from './soporte/cotizar-vista-previa'
import {
  PNG,
  ROSA,
  SVG_CON_ESTILO,
  SVG_SIMPLE,
  VERDE,
  WEBP,
  leerConElLogo,
} from './soporte/cotizar-pdf-logo'
import { tomarInstantaneaDeEmpresa, restaurarEmpresa } from './soporte/empresa'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'
import { formatearMonto } from '../src/shared/lib/formato'

// El PDF de una cotización guardada (paso 4.18-3a, `docs/COTIZADOR.md` › «Plantilla de tarjeta (PDF)»): `GET /cotizaciones/<id>/pdf` dibuja en el servidor la tarjeta de **lo
// guardado** con la sesión de quien lo pide. El total del PDF es la suma de sus líneas: con dos tipos de cambio, Bs ÷ el tipo de cambio del total (C13).
test.describe.configure({ mode: 'serial' })

// Lo que pesa y tarda el PDF de la subasta en local (`docs/RENDIMIENTO.md`, la fila del PDF de la tarjeta).
const TOPE_DE_BYTES_DEL_PDF = 150_000
const TOPE_DE_MS_DEL_PDF = 1_500

let origen = { id: '', nombre: '' }
let origenVivo = { id: '', nombre: '' }
let duena = ''
let leadDeLaDuena = ''
let asesora = { email: '', nombre: '' }
let leadDeLaAsesora = ''
let sinClave = ''
let subasta = ''
let vehiculo = ''
let vehiculoDe2019 = ''
let deLaSubasta = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena, lead: leadDeLaDuena } = await prepararGuardado(proyecto, 'pdf'))
  asesora = await crearAsesoraDeLaSemilla(`pdf-${proyecto}`)
  leadDeLaAsesora = await crearLead({
    nombre: `pdf ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora.email,
  })
  sinClave = correoDePrueba(`sin-cotizaciones-pdf-${proyecto}`)
  await crearPersona({
    email: sinClave,
    contrasena: CONTRASENA,
    nombre: 'Sara Sinver',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinClave,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sin cotizaciones`, clave: 'e2e_sin_cotizaciones_pdf' },
    permisos: ['vehiculos.ver'],
  })
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  const titulo = `PDF Hilux ${proyecto}`
  await cargarVehiculos(subasta, [{ titulo, anio: 2020, atributos: { tipo_vehiculo: 'autos' } }])
  vehiculo = (await vehiculoPorTitulo(titulo))?.id ?? ''
  expect(vehiculo, 'el vehículo de la subasta').not.toBe('')
  origenVivo = await crearOrigenDeCotizar(proyecto, 'pdfviva', true)
  publicarConTablaViva(origenVivo.id, 100)
  vehiculoDe2019 = crearVehiculoDePrueba(origenVivo.id, `PDF 2019 ${proyecto}`, 2019)
})

test.afterAll(async () => {
  if (vehiculo !== '') {
    sql(`delete from public.cotizaciones where vehiculo_id = ${literal(vehiculo)}::uuid`)
    sql(`delete from public.vehiculos where id = ${literal(vehiculo)}::uuid`)
  }
  await limpiarGuardado()
  await borrarLeadsDePrueba()
  await borrarRolesDePrueba()
})

const enLaSubasta = (lead: string) => urlDeLaSubasta(subasta, lead, vehiculo)

test('E2E el PDF de una guardada se descarga con su nombre y sus cabeceras; sin sesión va al ingreso', async ({
  page,
  playwright,
  baseURL,
}) => {
  await cotizarEnLaSubasta(page, duena, enLaSubasta(leadDeLaDuena))
  deLaSubasta = await guardarLaHojaAbierta(page)
  const respuesta = await pedirElPdf(page, deLaSubasta)
  expect(respuesta.status()).toBe(200)
  const cabeceras = respuesta.headers()
  expect(cabeceras['content-type']).toBe('application/pdf')
  expect(cabeceras['content-disposition']).toBe(
    `attachment; filename="cotizacion-${String(snapshotDe(deLaSubasta).numero)}.pdf"`,
  )
  expect(cabeceras['cache-control']).toBe('private, no-store')
  expect(cabeceras['x-content-type-options']).toBe('nosniff')
  expect((await respuesta.body()).subarray(0, 5).toString('latin1')).toBe('%PDF-')
  const sinSesion = await playwright.request.newContext({ baseURL })
  const afuera = await sinSesion.get(rutaDelPdfDe(deLaSubasta), { maxRedirects: 0 })
  expect([302, 303, 307]).toContain(afuera.status())
  expect(afuera.headers()['location']).toMatch(/\/ingreso\b/)
  await sinSesion.dispose()
})

test('E2E en «Paralelo» el total del PDF es Bs ÷ el tipo de cambio del total, no la suma de sus filas', async ({
  page,
}, info) => {
  await cotizarEnLaSubasta(page, duena, enLaSubasta(leadDeLaDuena))
  await expect(page.getByRole('radio', { name: 'Auto gasolina' })).toBeChecked()
  const id = await guardarLaHojaAbierta(page)
  const s = snapshotDe(id)
  const pdf = await leerElPdf(page, id)
  anotar(info, 'bytes del PDF de subasta_usa', pdf.bytes)
  anotar(info, 'ms del PDF de subasta_usa', pdf.ms)
  expect(pdf.bytes).toBeLessThanOrEqual(TOPE_DE_BYTES_DEL_PDF)
  expect(pdf.ms).toBeLessThanOrEqual(TOPE_DE_MS_DEL_PDF)
  filasSonLoGuardado(pdf.lineas, s)
  expect(s.totales.usd).not.toBeNull()
  expect(pdf.lineas).toContain(`${s.etiquetaDelTotal} ${usd(s, s.totales.usd ?? 0)}`)
  const cuenta = cuentaDelPdf(pdf.lineas, s)
  expect(Math.abs(cuenta.porLaCuenta - cuenta.total)).toBeLessThanOrEqual(cuenta.tolerancia)
  // Aduana va a otro tipo de cambio: la suma de las filas se aparta del total más que el redondeo.
  expect(Math.abs(cuenta.ingenua - cuenta.total)).toBeGreaterThan(cuenta.tolerancia)
  const bs = s.totales.bs
  if (bs !== null) {
    const enBs = formatearMonto(bs, { moneda: monedaDelTotal(s), locale: s.locale })
    expect(pdf.lineas.some((l) => l.includes(enBs))).toBe(false)
  }
})

test('E2E en «Unificado» con los tres tipos de cambio iguales la suma de las filas es el total, y «Ver total en moneda local» lo dice en Bs', async ({
  page,
}) => {
  await cotizarEnLaSubasta(page, duena, enLaSubasta(leadDeLaDuena))
  await page.locator('[data-cabecera]').getByText('Unificado', { exact: true }).click()
  await alDia(page)
  const oficial = sql("select valor from public.tipos_cambio where clave = 'oficial'")
  await tipearEnLaHoja(page, 'tc_unificado', oficial.replace('.', ','))
  await alDia(page)
  await page.getByRole('switch', { name: 'Ver total en moneda local' }).click()
  await alDia(page)
  const id = await guardarLaHojaAbierta(page)
  const s = snapshotDe(id)
  expect(s.modo).toBe('unificado')
  expect(s.valores['tc_unificado']).toBe(Number(oficial))
  const pdf = await leerElPdf(page, id)
  filasSonLoGuardado(pdf.lineas, s)
  const cuenta = cuentaDelPdf(pdf.lineas, s)
  expect(Math.abs(cuenta.porLaCuenta - cuenta.total)).toBeLessThanOrEqual(cuenta.tolerancia)
  expect(Math.abs(cuenta.ingenua - cuenta.total)).toBeLessThanOrEqual(cuenta.tolerancia)
  expect(s.totales.bs).not.toBeNull()
  const enBs = formatearMonto(s.totales.bs ?? 0, { moneda: monedaDelTotal(s), locale: s.locale })
  expect(pdf.lineas).toContain(enBs)
})

test('E2E si lo de hoy no es lo guardado, el PDF lleva lo guardado', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  const id = await guardarPorLaHoja(page, {
    origenId: origenVivo.id,
    lead: leadDeLaDuena,
    pub: '100',
    vehiculoId: vehiculoDe2019,
  })
  // Con el factor de 2019 en 100: 205 guardado; con 300, 405 hoy (como E8 de cotizar-vista-previa).
  cambiarElFactorVivo(origenVivo.id, 300)
  await page.goto(`/cotizaciones/${id}`)
  await expect(page.locator('[data-total]')).toContainText('405,00')
  const s = snapshotDe(id)
  const { lineas } = await leerElPdf(page, id)
  expect(lineas).toContain(`Total ${usd(s, 205)}`)
  expect(lineas.some((l) => l.includes(usd(s, 405)))).toBe(false)
})

test('E2E la asesora y la dueña, que ve «costos», descargan las mismas líneas, sin ninguna celda de un nivel', async ({
  page,
}) => {
  const oculto = ocultoDeUnaFormulaSembrada('subasta_usa', 'costos')
  expect(oculto.etiquetas.length, 'la subasta tiene celdas de costos').toBeGreaterThan(0)
  await cotizarEnLaSubasta(page, asesora.email, enLaSubasta(leadDeLaAsesora))
  const id = await guardarLaHojaAbierta(page)
  const deLaAsesora = (await leerElPdf(page, id)).lineas
  await abrirLaHoja(page, duena, `/cotizaciones/${id}`)
  const deLaDuena = (await leerElPdf(page, id)).lineas
  expect(deLaDuena).toEqual(deLaAsesora)
  for (const etiqueta of oculto.etiquetas) {
    expect(
      deLaDuena.some((l) => l.includes(etiqueta)),
      etiqueta,
    ).toBe(false)
  }
})

test('E2E quien no ve la cotización, una de la papelera, una que no existe y un id que no es un id dan el mismo 404', async ({
  page,
}) => {
  const comoNoDisponible = (id: string) => exigirNoDisponible(page, id)
  await entrar(page, sinClave, { fresco: true })
  await comoNoDisponible(deLaSubasta)
  await page.context().clearCookies()
  await entrar(page, duena, { fresco: true })
  const enLaPapelera = await guardarPorLaHoja(page, {
    origenId: origen.id,
    lead: leadDeLaDuena,
    pub: '50',
  })
  expect((await pedirElPdf(page, enLaPapelera)).status()).toBe(200)
  mandarALaPapelera(enLaPapelera)
  await comoNoDisponible(enLaPapelera)
  await comoNoDisponible('00000000-0000-4000-8000-00000000dead')
  await comoNoDisponible('no-es-un-id')
})

test('E2E un origen sin plantilla da el PDF por omisión, sólo con «Total»; vencida lo dice', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const id = await guardarPorLaHoja(page, { origenId: origen.id, lead: leadDeLaDuena, pub: '1200' })
  const s = snapshotDe(id)
  let { lineas } = await leerElPdf(page, id)
  expect(lineas).toContain(`Total ${usd(s, 1205)}`)
  expect(lineas.some((l) => l.includes(`Cotización n.º ${String(s.numero)}`))).toBe(true)
  for (const fuera of ['Tipo de cambio', 'Plazo', 'Vencida']) {
    expect(
      lineas.some((l) => l.includes(fuera)),
      fuera,
    ).toBe(false)
  }
  envejecerLaCotizacion(id, 400)
  ;({ lineas } = await leerElPdf(page, id))
  expect(lineas.some((l) => l.includes('Vencida'))).toBe(true)
})

test('E2E el logo: un PNG va como imagen, un SVG simple como vector, y un SVG con estilos o un WebP no van; las líneas no cambian', async ({
  page,
}) => {
  const antes = await tomarInstantaneaDeEmpresa()
  try {
    await entrar(page, duena, { fresco: true })
    sql('update public.ajustes_empresa set logo_ruta = null where id = 1')
    const sinLogo = await leerElPdf(page, deLaSubasta)
    expect(sinLogo.leido.imagenes).toBe(0)
    expect(sinLogo.leido.rellenos).not.toContain(VERDE)
    expect(sinLogo.leido.rellenos).not.toContain(ROSA)
    const conLogo = (datos: Buffer, extension: string, tipo: string) =>
      leerConElLogo(page, deLaSubasta, { datos, extension, tipo }, sinLogo.lineas)
    expect((await conLogo(PNG, 'png', 'image/png')).imagenes).toBe(1)
    const simple = await conLogo(SVG_SIMPLE, 'svg', 'image/svg+xml')
    expect(simple.imagenes).toBe(0)
    expect(simple.rellenos).toContain(VERDE)
    const conEstilo = await conLogo(SVG_CON_ESTILO, 'svg', 'image/svg+xml')
    expect(conEstilo.imagenes).toBe(0)
    expect(conEstilo.rellenos).not.toContain(VERDE)
    expect(conEstilo.rellenos).not.toContain(ROSA)
    expect((await conLogo(WEBP, 'webp', 'image/webp')).imagenes).toBe(0)
  } finally {
    await restaurarEmpresa(antes)
  }
})
