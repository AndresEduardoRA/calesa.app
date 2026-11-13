// @sin-celular-archivo: pantalla nueva con un solo camino feliz en escritorio (.claude/rules/e2e.md › «Pruebas: sólo lo clave»); el asistente y la lista no cambian con el ancho
import { readFileSync } from 'node:fs'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { codigoDePaisDeLaEmpresa } from './soporte/leads-alta'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { literal, sql } from './soporte/sql'

// La importación total desde `/datos` (9.06), con `pnpm funciones`: la dueña importa 3 leads para una asesora, uno con el teléfono de un
// lead que ya es de otra persona. La pantalla sigue el avance leído de la base hasta el resultado («2 creados, 1 ya existía…»), las
// rechazadas salen con las celdas del archivo y sin nombrar a nadie, la lista «Importaciones» la muestra, y la asesora ve los dos leads.
// El permiso, el limbo y la idempotencia los prueban `supabase/tests/areas/datos/importar.sql` y `datos-importar-funcion.spec.ts`.
test.describe.configure({ mode: 'serial' })

// Nacionales y sin `+`: la base les pone el código de país de la empresa, y el CSV de las rechazadas no les antepone el apóstrofo.
const TELEFONO_EXISTENTE = '71239101'
const NUEVOS = ['E2E Pantalla uno', 'E2E Pantalla dos'] as const
const REPETIDO = 'E2E Pantalla repetido'
let duena = ''
let asesora = ''
let otra = ''

test.beforeAll(async ({}, info) => {
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-pantalla-${info.project.name}`)
  asesora = correoDePrueba(`asesora-pantalla-${info.project.name}`)
  otra = correoDePrueba(`otra-pantalla-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Pantalla' })
  for (const [email, nombre, clave] of [
    [asesora, 'Ana Pantalla', 'e2e_pantalla_asesora'],
    [otra, 'Olga Pantalla', 'e2e_pantalla_otra'],
  ] as const) {
    await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
    sql(`update public.perfiles set invitacion_aceptada_en = now() where email = ${literal(email)}`)
    await darRolDePrueba({
      email,
      rol: { nombre: `E2E ${nombre}`, clave },
      permisos: ['leads.crear', { clave: 'leads.ver', alcance: 'propios' }],
    })
  }
  await crearLead({
    nombre: 'ya estaba en otra cartera',
    telefono: `${await codigoDePaisDeLaEmpresa()}${TELEFONO_EXISTENTE}`,
    deQuien: otra,
  })
})

test.afterAll(async () => {
  sql(`delete from public.leads where id in (select v.lead_id from public.importaciones_leads v
         join public.importaciones i on i.id = v.importacion_id join public.perfiles p on p.id = i.usuario_id
        where p.email = ${literal(duena)});
       delete from public.importaciones i using public.perfiles p where p.id = i.usuario_id and p.email = ${literal(duena)}`)
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E escritorio: la dueña importa 3 leads para una asesora y ve el resultado', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await entrar(page, duena)
  await page.goto('/datos?seccion=importar&entidad=leads')
  await page.getByLabel('Destino').selectOption({ label: 'Ana Pantalla' })
  const csv = [
    'Nombre;Teléfono',
    `${NUEVOS[0]};71239111`,
    `${REPETIDO};${TELEFONO_EXISTENTE}`,
    `${NUEVOS[1]};71239112`,
  ].join('\n')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'leads.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  })
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()
  await expect(page.getByText('De las primeras 3 filas: 3 listas y 0 con errores.')).toBeVisible()
  await page.getByRole('button', { name: 'Importar 3 filas' }).click()

  // La lista de abajo repite la frase y el botón: sólo el resumen del asistente lleva las celdas del archivo.
  const resumen = page.getByRole('region', { name: 'Importación en curso' })
  await expect(resumen.getByText('2 creados, 1 ya existía y ninguno con errores.')).toBeVisible({
    timeout: 90_000,
  })
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    resumen.getByRole('button', { name: 'Descargar las rechazadas' }).click(),
  ])
  expect(descarga.suggestedFilename()).toBe('importacion-rechazadas.csv')
  const texto = readFileSync(await descarga.path(), 'utf8')
  expect(texto).toContain('Fila;Nombre;Teléfono;Resultado;Motivo')
  expect(texto).toContain(
    `3;${REPETIDO};${TELEFONO_EXISTENTE};Ya existe;Ya hay un lead con este teléfono.`,
  )
  expect(texto).not.toContain('Olga')
  expect(texto).not.toContain(NUEVOS[0])

  const lista = page.getByRole('region', { name: 'Importaciones' })
  const fila = lista.getByRole('listitem').filter({ hasText: 'para Ana Pantalla' }).first()
  await expect(fila.getByText('Terminada')).toBeVisible()
  await expect(fila.getByText('2 creados, 1 ya existía y ninguno con errores.')).toBeVisible()
})

test('E2E escritorio: la asesora ve en su cartera los dos leads importados', async ({ page }) => {
  // Los dos nuevos nacieron en la cartera de la asesora; el repetido no se creó.
  await page.context().clearCookies()
  await entrar(page, asesora, { fresco: true })
  await page.goto('/leads')
  for (const nombre of NUEVOS) {
    await expect(page.getByText(nombre).first()).toBeVisible()
  }
  await expect(page.getByText(REPETIDO)).toHaveCount(0)
})
