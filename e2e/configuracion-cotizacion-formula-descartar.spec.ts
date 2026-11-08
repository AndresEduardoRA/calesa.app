// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
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
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { sembrarBorrador, sembrarVersiones } from './soporte/formula-versiones'
import { literal, sql } from './soporte/sql'

// Descartar el borrador de la fórmula desde Configuración › Cotización › «Fórmula» (4.20-2c, `docs/UX.md` › «Cotización: fórmula (estados propios)»): un `<Confirmar>`
// con su URL (`?panel=descartar-borrador`) que nombra el borrador, por `formula_descartar_borrador()`; lo descarta todo el que configura el origen (P2 del 4.20-2c),
// también uno atrasado, y la publicada no cambia.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let configuradora = ''
let alDia = { id: '', nombre: '' }
let atrasado = { id: '', nombre: '' }
let sinBorrador = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-descartar-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Pía Descarta' })
  alDia = await crearOrigenDeCotizar(proyecto, 'desaldia', true)
  atrasado = await crearOrigenDeCotizar(proyecto, 'desatras', true)
  sinBorrador = await crearOrigenDeCotizar(proyecto, 'dessinb', true)
  sembrarBorrador(alDia.id, { autor: duena, sobre: 'publicada', conDiseno: true })
  // La publicada pasa a ser la 2 y el borrador empezó sobre la 1: atrasado.
  sembrarVersiones(atrasado.id, 1, { autor: duena, borradorAtrasado: true })
  configuradora = correoDePrueba(`configura-descartar-${proyecto}`)
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Cleo Configura',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Descarta ${proyecto}`, clave: `e2e_descarta_${proyecto}` },
    permisos: [alDia, atrasado, sinBorrador].map((origen) => ({
      clave: 'cotizaciones.configurar',
      origenId: origen.id,
    })),
  })
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function abrirFormula(page: Page, origenId: string, resto = '') {
  await page.goto(`/configuracion/cotizacion?seccion=formula&origen=${origenId}${resto}`)
  await expect(page.getByRole('heading', { name: 'Fórmula', level: 2 })).toBeVisible()
}

const dialogo = (page: Page) =>
  page.getByRole('dialog', { name: 'Descartar el borrador de Pía Descarta' })
const botonDescartar = (page: Page) => page.getByRole('button', { name: 'Descartar…', exact: true })
const borrador = (page: Page) => page.getByRole('region', { name: 'Borrador' })
const idDe = (correo: string) =>
  sql(`select id from public.perfiles where email = ${literal(correo)}`)

test('quien configura el origen descarta el borrador de otra persona; cancelar, Esc y «atrás» no borran', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await abrirFormula(page, alDia.id)
  await expect(borrador(page)).toBeVisible()
  await botonDescartar(page).click()
  await expect(dialogo(page)).toBeVisible()
  await expect(page).toHaveURL(/panel=descartar-borrador/)
  await expect(dialogo(page)).toContainText('no se puede deshacer')
  // Recargar lo reabre; «atrás» lo cierra y el borrador sigue.
  await page.reload()
  await expect(dialogo(page)).toBeVisible()
  await page.goBack()
  await expect(dialogo(page)).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(borrador(page)).toBeVisible()
  await botonDescartar(page).click()
  await dialogo(page).getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialogo(page)).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(borrador(page)).toBeVisible()
  await botonDescartar(page).click()
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toBeHidden()
  await expect(borrador(page)).toBeVisible()
  await botonDescartar(page).click()
  await dialogo(page).getByRole('button', { name: 'Descartar borrador' }).click()
  await expect(page.getByText('Se descartó el borrador.')).toBeVisible()
  await expect(dialogo(page)).toBeHidden()
  await expect(borrador(page)).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Publicada' })).toContainText(
    'Publicada: versión 1',
  )
  await expect(page).not.toHaveURL(/panel=/)
  const origen = `${literal(alDia.id)}::uuid`
  expect(
    sql(`select count(*) from public.formulas where origen_id = ${origen} and estado = 'borrador'`),
  ).toBe('0')
  // La base deja quién descartó (Cleo), que no es quien guardó el borrador (Pía).
  const actividad = sql(`
    select a.actor_id || '|' || (a.antes ->> 'creado_por') from public.actividad a
     where a.accion = 'formulas.delete' and (a.antes ->> 'origen_id')::uuid = ${origen}`)
  expect(actividad).toBe(`${idDe(configuradora)}|${idDe(duena)}`)
})

test('un borrador atrasado no se publica pero se descarta', async ({ page }) => {
  await entrar(page, configuradora)
  await abrirFormula(page, atrasado.id)
  await expect(borrador(page)).toContainText('publicarlo dará conflicto')
  await expect(page.getByRole('button', { name: 'Publicar…' })).toHaveCount(0)
  await botonDescartar(page).click()
  await dialogo(page).getByRole('button', { name: 'Descartar borrador' }).click()
  await expect(page.getByText('Se descartó el borrador.')).toBeVisible()
  await expect(borrador(page)).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Publicada' })).toContainText(
    'Publicada: versión 2',
  )
})

test('la URL no abre descartar sin borrador', async ({ page }) => {
  await entrar(page, configuradora)
  await abrirFormula(page, sinBorrador.id, '&panel=descartar-borrador')
  await expect(page.getByText('No hay borrador para descartar.')).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(botonDescartar(page)).toHaveCount(0)
})
