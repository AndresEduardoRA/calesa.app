import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import {
  borrarOrigenesDeCotizar,
  crearOrigenDeCotizar,
  publicarLaVersionSiguiente,
} from './soporte/cotizar-formula'
import { sembrarBorrador, sembrarVersiones } from './soporte/formula-versiones'
import { literal, sql } from './soporte/sql'

// Revertir la fórmula a una versión archivada desde Configuración › Cotización › «Fórmula» (4.20-2b, `docs/UX.md` › «Cotización: fórmula (estados propios)»): publica la
// N+1 como copia de esa versión con su diseño (`formula_revertir()`), sin tocar el borrador; la nota viene escrita y vacía se rechaza antes de pedir; el PT409 de la base
// se muestra tal cual con «Recargar»; la URL (`?panel=revertir-formula&version=<id>`) se revisa al llegar.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let conBorrador = { id: '', nombre: '' }
let carrera = { id: '', nombre: '' }
let porUrl = { id: '', nombre: '' }
let sinPublicada = { id: '', nombre: '' }
let larga = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-revertir-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Revierte' })
  conBorrador = await crearOrigenDeCotizar(proyecto, 'revborrador', true)
  carrera = await crearOrigenDeCotizar(proyecto, 'revcarrera', true)
  porUrl = await crearOrigenDeCotizar(proyecto, 'revurl', true)
  sinPublicada = await crearOrigenDeCotizar(proyecto, 'revsinpub', false)
  larga = await crearOrigenDeCotizar(proyecto, 'revlarga', true)
  // Las archivadas 1 y 2 y la publicada 3.
  sembrarVersiones(conBorrador.id, 2, { autor: duena })
  sembrarVersiones(carrera.id, 2, { autor: duena })
  sembrarVersiones(porUrl.id, 2, { autor: duena })
  sembrarVersiones(larga.id, 25, { autor: duena })
  sembrarBorrador(conBorrador.id, { autor: duena, sobre: 'publicada', conDiseno: true })
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
})

async function abrirFormula(page: Page, origenId: string, resto = '') {
  await page.goto(`/configuracion/cotizacion?seccion=formula&origen=${origenId}${resto}`)
  await expect(page.getByRole('heading', { name: 'Fórmula', level: 2 })).toBeVisible()
}

const modal = (page: Page, version: number) =>
  page.getByRole('dialog', { name: `Revertir a la versión ${String(version)}` })
const publicada = (page: Page) => page.getByRole('region', { name: 'Publicada' })

const idDe = (origenId: string, version: number) =>
  sql(
    `select id from public.formulas where origen_id = ${literal(origenId)}::uuid and version = ${String(version)}`,
  ).trim()

test('revertir a la 1 publica la 4 como su copia, con la nota escrita, y el borrador queda atrasado', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirFormula(page, conBorrador.id)
  await expect(
    page.getByRole('button', { name: 'Revertir a la versión 3', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Revertir a la versión 1', exact: true }).click()
  await expect(modal(page, 1)).toBeVisible()
  await expect(page).toHaveURL(
    new RegExp(`panel=revertir-formula&version=${idDe(conBorrador.id, 1)}`),
  )
  await expect(modal(page, 1).getByLabel('Nota')).toHaveValue('Vuelve a la versión 1.')
  await modal(page, 1).getByLabel('Nota').fill('  ')
  await modal(page, 1).getByRole('button', { name: 'Revertir', exact: true }).click()
  await expect(modal(page, 1).getByText('Publicar pide una nota.')).toBeVisible()
  await modal(page, 1).getByLabel('Nota').fill('Vuelve a la versión 1.')
  await modal(page, 1).getByRole('button', { name: 'Revertir', exact: true }).click()
  await expect(page.getByText('Se publicó una copia de la versión 1.')).toBeVisible()
  await expect(modal(page, 1)).toBeHidden()
  await expect(publicada(page)).toContainText('Publicada: versión 4')
  await expect(publicada(page)).toContainText('Vuelve a la versión 1.')
  await expect(page.getByRole('region', { name: 'Borrador' })).toContainText(
    'Después de que empezó, se publicó la versión 4: publicarlo dará conflicto.',
  )
  // Las archivadas sembradas son iguales: lo que se copió lo dice la actividad de la nueva.
  const copiada = sql(`
    select a.despues ->> 'version_copiada' from public.actividad a
     where a.accion = 'formula.publicada' and a.registro_id = ${literal(idDe(conBorrador.id, 4))}`)
  expect(copiada.trim()).toBe('1')
})

test('si otra persona publicó con el modal abierto, el conflicto dice quién sin «Recargá» y, al recargar, se revierte', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirFormula(page, carrera.id)
  await page.getByRole('button', { name: 'Revertir a la versión 1', exact: true }).click()
  await expect(modal(page, 1)).toBeVisible()
  publicarLaVersionSiguiente(carrera.id, 9)
  await modal(page, 1).getByRole('button', { name: 'Revertir', exact: true }).click()
  const conflicto = modal(page, 1).getByText(/^Otra persona publicó la versión 4/)
  await expect(conflicto).toBeVisible()
  await expect(conflicto).not.toContainText('Recarg')
  await modal(page, 1).getByRole('button', { name: 'Recargar' }).click()
  await expect(conflicto).toBeHidden()
  await expect(modal(page, 1).getByLabel('Nota')).toHaveValue('Vuelve a la versión 1.')
  await modal(page, 1).getByRole('button', { name: 'Revertir', exact: true }).click()
  await expect(page.getByText('Se publicó una copia de la versión 1.')).toBeVisible()
  await expect(publicada(page)).toContainText('Publicada: versión 5')
})

test('la URL no abre revertir la publicada, una versión que no está ni un origen sin publicada', async ({
  page,
}) => {
  await entrar(page, duena)
  await abrirFormula(page, porUrl.id, `&panel=revertir-formula&version=${idDe(porUrl.id, 3)}`)
  await expect(page.getByText('Esa ya es la versión publicada.')).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  const ajena = '00000000-0000-4000-8000-00000000abcd'
  await abrirFormula(page, porUrl.id, `&panel=revertir-formula&version=${ajena}`)
  await expect(
    page.getByText('Esa versión no está en la lista: búscala y elige «Revertir».'),
  ).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  await abrirFormula(page, sinPublicada.id, `&panel=revertir-formula&version=${ajena}`)
  await expect(page.getByText('Sin una versión publicada no hay a qué revertir.')).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // Llegar con una archivada de la primera página sí abre.
  await abrirFormula(page, porUrl.id, `&panel=revertir-formula&version=${idDe(porUrl.id, 2)}`)
  await expect(modal(page, 2)).toBeVisible()
})

test('una versión traída por «Ver más» también se revierte', async ({ page }) => {
  await entrar(page, duena)
  await abrirFormula(page, larga.id)
  await page.getByRole('button', { name: 'Ver más' }).click()
  await page.getByRole('button', { name: 'Revertir a la versión 2', exact: true }).click()
  await expect(modal(page, 2)).toBeVisible()
  await expect(modal(page, 2).getByLabel('Nota')).toHaveValue('Vuelve a la versión 2.')
  await modal(page, 2).getByRole('button', { name: 'Cancelar' }).click()
  await expect(modal(page, 2)).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
})
