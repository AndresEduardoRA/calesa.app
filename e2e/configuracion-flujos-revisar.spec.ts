// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { literal, sql } from './soporte/sql'

// Configuración › Flujos › la franja de «Revisar» (5.12-2, `docs/UX.md` › «Flujos: revisar (estados propios)»): un flujo con una fase sin salida y una espera
// mutua con el flujo de repuestos da «2 avisos»; abierta, el aviso de la fase sin salida abre su inspector, y al agregarle la salida desde ahí el aviso se va.
// Un solo recorrido: cada código lo prueba la base (`supabase/tests/flujos-revisar.sql`). Todo se siembra por SQL.
test.describe.configure({ mode: 'serial' })

const P = 'E2E 5.12'
const INICIO = `${P} Inicio`
const A = `${P} A`
const B = `${P} B`
const FIN = `${P} Fin`

let duena = ''
let origen = { id: '', nombre: '' }
let flujoDeRepuestos = ''
let esperasDeRepuestosAntes: string | null = null
const fases: Record<string, string> = {}

function borrarRequisitosDePrueba(): void {
  sql(`delete from public.fases_requisitos where notas like ${literal(`${P}%`)}`)
}

function fijarEsperas(flujo: string, activa: boolean): void {
  sql(
    `insert into public.flujos_reglas (flujo_id, regla, activa) values ('${flujo}', 'esperas', ${String(activa)})
       on conflict (flujo_id, regla) do update set activa = excluded.activa`,
  )
}

function sembrar(): void {
  const flujo = sql(`select id from public.flujos where origen_id = '${origen.id}'`)
  fijarEsperas(flujo, true)
  const filas = [
    [INICIO, 10, true, false],
    [A, 20, false, false],
    [B, 30, false, false],
    [FIN, 40, false, true],
  ] as const
  for (const [nombre, orden, inicial, final] of filas) {
    fases[nombre] = sql(
      `insert into public.fases (flujo_id, nombre, orden, es_inicial, es_final)
       values ('${flujo}', ${literal(nombre)}, ${String(orden)}, ${String(inicial)}, ${String(final)}) returning id`,
    )
  }
  for (const [de, a] of [
    [INICIO, A],
    [A, FIN],
    [INICIO, B],
  ] as const) {
    sql(
      `insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values ('${flujo}', '${fases[de] ?? ''}', '${fases[a] ?? ''}')`,
    )
  }
  // La espera mutua: A espera a la primera fase de repuestos y esa fase espera a A (las dos bloqueantes: un informativo sumaría otro aviso).
  flujoDeRepuestos = sql(
    `select id from public.flujos where ambito = 'repuestos' order by nombre limit 1`,
  )
  const r = sql(
    `select id from public.fases where flujo_id = '${flujoDeRepuestos}' and activa order by orden limit 1`,
  )
  const antes = sql(
    `select activa::text from public.flujos_reglas where flujo_id = '${flujoDeRepuestos}' and regla = 'esperas'`,
  )
  esperasDeRepuestosAntes = antes === '' ? null : antes
  fijarEsperas(flujoDeRepuestos, true)
  sql(
    `insert into public.fases_requisitos (fase_id, tipo, bloqueante, espera_fase_id, espera_ambito, notas)
     values ('${fases[A] ?? ''}', 'espera', true, '${r}', 'hijos', ${literal(`${P} A espera a R`)})`,
  )
  sql(
    `insert into public.fases_requisitos (fase_id, tipo, bloqueante, espera_fase_id, espera_ambito, notas, orden)
     select '${r}', 'espera', true, '${fases[A] ?? ''}', 'padre', ${literal(`${P} R espera a A`)}, coalesce(max(orden), 0) + 10
       from public.fases_requisitos where fase_id = '${r}'`,
  )
}

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  borrarRequisitosDePrueba()
  await borrarOrigenes([])
  origen = await crearOrigenDePrueba(`${P} Origen`, 'e2e_flujo_revisar')
  sembrar()
  duena = correoDePrueba(`duena-revisar-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Revisar' })
})

test.afterAll(async () => {
  // Antes que el origen: la espera de repuestos apunta a una fase suya.
  borrarRequisitosDePrueba()
  if (flujoDeRepuestos !== '') {
    if (esperasDeRepuestosAntes === null) {
      sql(
        `delete from public.flujos_reglas where flujo_id = '${flujoDeRepuestos}' and regla = 'esperas'`,
      )
    } else {
      fijarEsperas(flujoDeRepuestos, esperasDeRepuestosAntes === 'true')
    }
  }
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test(`${P} la franja marca la fase sin salida y la espera cruzada, abre la fase y el aviso se va al agregarle la salida`, async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/flujos?origen=${origen.id}`)
  const franja = page.getByRole('region', { name: 'Revisar el flujo' })
  const resumen = franja.getByRole('button', { name: /^Revisar:/ })
  await expect(resumen).toHaveText(/2 avisos/)
  await expect(resumen).toHaveAttribute('aria-expanded', 'false')

  await resumen.click()
  await expect(resumen).toHaveAttribute('aria-expanded', 'true')
  await expect(franja.getByRole('listitem').filter({ hasText: B })).toContainText('no tiene salida')
  await expect(franja.getByRole('listitem').filter({ hasText: A })).toContainText(
    'Esperas cruzadas',
  )

  // El aviso abre el inspector de la fase sin salida; ahí se le agrega la salida.
  await franja.getByRole('button', { name: `Abrir la fase «${B}»` }).click()
  await expect(page).toHaveURL(new RegExp(`fase=${fases[B] ?? ''}`))
  const inspector = page.getByRole('dialog').filter({ hasText: 'Salidas y quién mueve' })
  await expect(inspector).toBeVisible()
  await expect(inspector.getByRole('heading', { name: B })).toBeVisible()
  const formulario = inspector.getByRole('form', { name: 'Agregar salida' })
  await inspector.getByRole('button', { name: 'Agregar salida' }).click()
  await formulario.getByLabel('Fase de destino').selectOption({ label: FIN })
  await formulario.getByLabel('Acción').fill('Cerrar')
  await formulario.getByRole('button', { name: 'Agregar salida' }).click()
  await expect(formulario).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(inspector).toBeHidden()

  // Releída tras guardar, sigue abierta: queda la espera cruzada y la fase sin salida ya no está.
  await expect(resumen).toHaveText(/1 aviso\b/)
  await expect(resumen).toHaveAttribute('aria-expanded', 'true')
  await expect(franja.getByRole('listitem').filter({ hasText: B })).toHaveCount(0)
  await expect(franja.getByRole('listitem').filter({ hasText: A })).toContainText(
    'Esperas cruzadas',
  )
})
