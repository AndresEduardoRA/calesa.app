// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { lineaApagada, masAccionesDe, menuDe } from './soporte/lista-de-catalogo'
import {
  PREFIJO_DE_TIPO_DE_DOCUMENTO_E2E,
  abrirDocumentos,
  borrarTiposDeDocumentoDePrueba,
  modalDeTipo,
  nombresDelGrupo,
  seccionDelGrupo,
  sembrarTipoDelFlujo,
  tipoEnLaBase,
  usarEnUnRequisito,
} from './soporte/tipos-de-documento'

// Configuración › Flujos › Documentos (5.09, `docs/UX.md` › «Flujos: tipos de documento (estados propios)»): la dueña crea un tipo del flujo con vencimiento,
// lo edita, lo sube de orden, desactiva uno en uso (y lee por qué no se elimina) y elimina uno sin uso; quien sólo configura el flujo ve los de toda la
// empresa deshabilitados, con el motivo. Un solo recorrido del camino feliz: la base ya tiene sus pruebas de cada regla.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let configuradora = ''
const nombre = (resto: string) => `${PREFIJO_DE_TIPO_DE_DOCUMENTO_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarTiposDeDocumentoDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-documentos-${proyecto}`)
  configuradora = correoDePrueba(`configuradora-documentos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Documentos' })
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Flor Flujos',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Documentos ${proyecto}`,
      clave: `e2e_documentos_${proyecto}`,
    },
    permisos: ['flujos.configurar'],
  })
})

test.afterAll(async () => {
  borrarTiposDeDocumentoDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('la dueña crea un tipo del flujo con vencimiento, lo edita y lo sube de orden', async ({
  page,
}) => {
  const primero = nombre('Seguro')
  const renombrado = nombre('Seguro marítimo')
  const segundo = nombre('Factura')
  await entrar(page, duena, { fresco: true })
  await abrirDocumentos(page)
  const flujo = seccionDelGrupo(page, 'flujo')
  // Los de toda la empresa de la semilla, ya a la vista y con su uso.
  await expect(page.getByRole('button', { name: 'Abrir BL', exact: true })).toBeVisible()

  // Crear con vencimiento «renovar»: 365 días de vigencia y aviso a los 30.
  await flujo.getByRole('button', { name: 'Nuevo tipo' }).click()
  const nuevo = modalDeTipo(page, 'Nuevo tipo de documento de este flujo')
  await expect(nuevo).toBeVisible()
  await expect(page).toHaveURL(/panel=nuevo-tipo&de=flujo/)
  await nuevo.getByLabel('Nombre').fill(primero)
  await nuevo.getByLabel('Vencimiento').selectOption('renovar')
  await nuevo.getByLabel('Días de vigencia').fill('365')
  await nuevo.getByLabel('Días de aviso (opcional)').fill('30')
  await nuevo.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(nuevo).toBeHidden()
  const fila = flujo
    .locator('tr, li')
    .filter({ has: page.getByRole('button', { name: `Abrir ${primero}`, exact: true }) })
  await expect(fila).toContainText('Renueva cada 365 días')
  expect(tipoEnLaBase(primero)).toMatchObject({
    modo: 'renovar',
    vigencia: '365',
    aviso: '30',
    activo: true,
  })

  // Editar: un clic en la fila, nuevo nombre.
  await page.getByRole('button', { name: `Abrir ${primero}`, exact: true }).click()
  const edicion = modalDeTipo(page, 'Editar tipo de documento')
  await expect(edicion).toBeVisible()
  await expect(page).toHaveURL(/panel=editar-tipo&tipo=/)
  await expect(edicion.getByLabel('Días de vigencia')).toHaveValue('365')
  await edicion.getByLabel('Nombre').fill(renombrado)
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(edicion).toBeHidden()
  await expect(page.getByRole('button', { name: `Abrir ${renombrado}`, exact: true })).toBeVisible()
  expect(tipoEnLaBase(renombrado)).toMatchObject({ vigencia: '365' })

  // Subir de orden: uno sembrado queda debajo; «Subir» lo pone antes.
  sembrarTipoDelFlujo(segundo)
  await abrirDocumentos(page)
  const antes = await nombresDelGrupo(page, 'flujo')
  expect(antes.indexOf(renombrado)).toBeLessThan(antes.indexOf(segundo))
  const subir = page.getByRole('button', { name: `Subir ${segundo}`, exact: true })
  await subir.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('status').filter({ hasText: `«${segundo}» subió un lugar.` }),
  ).toBeAttached()
  await expect
    .poll(async () => {
      const despues = await nombresDelGrupo(page, 'flujo')
      return despues.indexOf(segundo) < despues.indexOf(renombrado)
    })
    .toBe(true)
  // Llegó al extremo y «Subir» se apagó: el foco pasa a «Bajar» de la misma fila.
  await expect(subir).toBeDisabled()
  await expect(page.getByRole('button', { name: `Bajar ${segundo}`, exact: true })).toBeFocused()
  expect(tipoEnLaBase(segundo)?.orden).toBeLessThan(tipoEnLaBase(renombrado)?.orden ?? 0)
})

test('desactiva uno en uso (y lee por qué no se elimina) y elimina uno sin uso', async ({
  page,
}) => {
  const enUso = nombre('Póliza')
  const sinUso = nombre('Recibo')
  sembrarTipoDelFlujo(enUso)
  sembrarTipoDelFlujo(sinUso)
  usarEnUnRequisito(enUso)
  await entrar(page, duena, { fresco: true })
  await abrirDocumentos(page)
  const flujo = seccionDelGrupo(page, 'flujo')
  // Uno en uso: se ve cuánto, no se elimina (se dice por qué) y sí se desactiva.
  const filaEnUso = flujo
    .locator('tr, li')
    .filter({ has: page.getByRole('button', { name: `Abrir ${enUso}`, exact: true }) })
  await expect(filaEnUso).toContainText('Lo usa 1 requisito')
  await masAccionesDe(page, enUso).click()
  await expect(page.getByRole('menuitem', { name: 'Eliminar', exact: true })).toBeDisabled()
  await expect(menuDe(page, enUso)).toContainText('se desactiva en lugar de eliminarse')
  await page.getByRole('menuitem', { name: 'Desactivar', exact: true }).click()
  await expect(filaEnUso.getByText('Desactivado')).toBeVisible()
  expect(tipoEnLaBase(enUso)).toMatchObject({ activo: false })

  // Uno sin uso: «Eliminar» pide confirmar nombrándolo y lo borra.
  await masAccionesDe(page, sinUso).click()
  await page.getByRole('menuitem', { name: 'Eliminar', exact: true }).click()
  await expect(page).toHaveURL(/panel=eliminar-tipo&tipo=/)
  const confirmar = page.getByRole('dialog', {
    name: `Eliminar el tipo de documento «${sinUso}»`,
  })
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole('button', { name: 'Eliminar tipo' }).click()
  await expect(confirmar).toBeHidden()
  await expect(page.getByRole('button', { name: `Abrir ${sinUso}`, exact: true })).toBeHidden()
  expect(tipoEnLaBase(sinUso)).toBeNull()
})

test('quien sólo configura el flujo ve los tipos de toda la empresa deshabilitados, con el motivo', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await abrirDocumentos(page)
  const empresa = seccionDelGrupo(page, 'empresa')
  const motivo =
    'Los tipos de documento de toda la empresa los cambia quien gestiona los catálogos de logística.'
  await expect(empresa.getByRole('button', { name: 'Nuevo tipo' })).toBeDisabled()
  await expect(empresa.getByText(motivo)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Subir BL', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Subir BL', exact: true })).toHaveAttribute(
    'title',
    motivo,
  )
  expect(await lineaApagada(page, 'BL', 'Editar')).toBe(true)
  // Lo de su flujo sí lo puede cambiar.
  await expect(
    seccionDelGrupo(page, 'flujo').getByRole('button', { name: 'Nuevo tipo' }),
  ).toBeEnabled()
  // Escribir la URL a mano no abre lo que no puede: no hay modal.
  await page.goto('/configuracion/flujos?seccion=documentos&panel=nuevo-tipo&de=empresa')
  await expect(page.getByRole('heading', { name: 'De toda la empresa', level: 2 })).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
})
