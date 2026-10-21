import { expect, test } from './soporte/prueba'
import { CONTRASENA, abrirConN, dialogo, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { descartarAviso } from './soporte/inventario'
import { borrarLeadsDePrueba, idDe } from './soporte/leads'
import { sesionDe } from './soporte/leads-alta'
import { cerrarMenu, elegirDelMenu, lineaDelMenu, menuDe } from './soporte/lista-de-catalogo'
import {
  PREFIJO_DE_ORIGEN_E2E,
  abrirOrigenes,
  borrarOrigenesDePrueba,
  filaDeOrigen,
  origenEnLaBase,
  sembrarOrigen,
} from './soporte/origenes-de-lead'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'
import { sql } from './soporte/sql'

// El origen «por defecto» de la empresa (Configuración de leads): se marca desde el «⋯» de la lista (uno solo: marcar otro desmarca al anterior),
// el que lo es no se apaga ni se elimina (la lista lo dice antes de intentarlo y la base lo rechaza igual), dos «por defecto» a la vez no existen,
// y el alta propone, en este orden, el último origen que usó la persona (mientras esté activo), el «por defecto» de la empresa y el primero activo.
test.describe.configure({ mode: 'serial' })

let duena = ''
let proyecto = ''
const nombre = (resto: string) => `${PREFIJO_DE_ORIGEN_E2E} ${resto} ${proyecto}`
const sinPorDefecto = () =>
  admin().from('origenes_lead').update({ por_defecto: false }).eq('por_defecto', true)

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLeadsDePrueba()
  await sinPorDefecto()
  await borrarOrigenesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-por-defecto-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Por Defecto' })
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await sinPorDefecto()
  await borrarOrigenesDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const porDefectoEnLaBase = async () =>
  ((await admin().from('origenes_lead').select('nombre').eq('por_defecto', true)).data ?? []).map(
    (fila) => fila.nombre,
  )

test('marcar por defecto desde el «⋯»: una insignia, uno solo, y «Deshacer» devuelve la marca al anterior', async ({
  page,
}, info) => {
  const a = await sembrarOrigen(nombre('Defecto A'))
  const b = await sembrarOrigen(nombre('Defecto B'))
  await entrar(page, duena)
  await abrirOrigenes(page)
  await expect(page.getByText('Por defecto', { exact: true })).toHaveCount(0)

  await elegirDelMenu(page, a.nombre, 'Marcar por defecto')
  await expect(filaDeOrigen(page, a.nombre).getByText('Por defecto', { exact: true })).toBeVisible()
  await expect(page.getByText(`«${a.nombre}» es ahora el origen por defecto.`)).toBeVisible()
  expect(await porDefectoEnLaBase()).toEqual([a.nombre])
  await descartarAviso(page, `«${a.nombre}» es ahora el origen por defecto.`)
  // Marcar no mueve la versión del origen (cambia otra fila como efecto, igual que ordenar).
  expect((await origenEnLaBase(a.nombre))?.actualizado_en).toBe(a.actualizado_en)

  // Marcar otro desmarca al anterior: nunca hay dos.
  await elegirDelMenu(page, b.nombre, 'Marcar por defecto')
  await expect(filaDeOrigen(page, b.nombre).getByText('Por defecto', { exact: true })).toBeVisible()
  await expect(filaDeOrigen(page, a.nombre).getByText('Por defecto', { exact: true })).toHaveCount(
    0,
  )
  await expect(page.getByText('Por defecto', { exact: true })).toHaveCount(1)
  expect(await porDefectoEnLaBase()).toEqual([b.nombre])
  await sinScrollHorizontal(page)
  await capturar(page, info, 'origenes-por-defecto')

  // «Deshacer»: la marca vuelve a «A».
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(filaDeOrigen(page, a.nombre).getByText('Por defecto', { exact: true })).toBeVisible()
  await expect.poll(porDefectoEnLaBase).toEqual([a.nombre])

  // Quitarla deja a la empresa sin origen por defecto (es opcional).
  await elegirDelMenu(page, a.nombre, 'Quitar «por defecto»')
  await expect(page.getByText('Por defecto', { exact: true })).toHaveCount(0)
  expect(await porDefectoEnLaBase()).toEqual([])
})

test('el origen por defecto no se apaga ni se elimina: la lista lo dice y la base lo rechaza', async ({
  page,
}) => {
  const origen = await sembrarOrigen(nombre('Defecto fijo'))
  await entrar(page, duena)
  await abrirOrigenes(page)
  await elegirDelMenu(page, origen.nombre, 'Marcar por defecto')
  await expect(
    filaDeOrigen(page, origen.nombre).getByText('Por defecto', { exact: true }),
  ).toBeVisible()

  const desactivar = await lineaDelMenu(page, origen.nombre, 'Desactivar')
  await expect(desactivar).toBeDisabled()
  await expect(
    page.getByText(
      `«${origen.nombre}» es el origen por defecto: quítale la marca o elige otro por defecto antes de desactivarlo.`,
    ),
  ).toBeVisible()
  await expect(
    menuDe(page, origen.nombre).getByRole('menuitem', { name: 'Eliminar', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByText(
      `«${origen.nombre}» es el origen por defecto: quítale la marca o elige otro por defecto antes de eliminarlo.`,
    ),
  ).toBeVisible()
  await cerrarMenu(page, origen.nombre)

  // La base lo rechaza aunque se llame sin la pantalla: ni apagarlo ni eliminarlo.
  const cliente = await sesionDe(duena, CONTRASENA)
  const version = (await origenEnLaBase(origen.nombre))?.actualizado_en ?? ''
  const apagar = await cliente.rpc('origen_lead_guardar', {
    p_id: origen.id,
    p_actualizado_en_esperado: version,
    p_cambios: { activo: false },
  })
  expect(apagar.error?.message).toContain('es el origen por defecto')
  const eliminar = await cliente.rpc('origen_lead_eliminar', {
    p_id: origen.id,
    p_actualizado_en_esperado: version,
  })
  expect(eliminar.error?.message).toContain('es el origen por defecto')
  expect(await origenEnLaBase(origen.nombre)).toMatchObject({ activo: true })
  // Quien salta la API tampoco consigue dos por defecto ni uno apagado.
  const otro = await sembrarOrigen(nombre('Defecto otro'))
  const dos = await admin().from('origenes_lead').update({ por_defecto: true }).eq('id', otro.id)
  expect(dos.error?.message).toContain('origenes_lead_por_defecto_unico')
  const apagado = await admin().from('origenes_lead').update({ activo: false }).eq('id', origen.id)
  expect(apagado.error?.message).toContain('origenes_lead_por_defecto_activo')
  // Quitando la marca y apagando a la vez, sí.
  const ambos = await cliente.rpc('origen_lead_guardar', {
    p_id: origen.id,
    p_actualizado_en_esperado: version,
    p_cambios: { por_defecto: false, activo: false },
  })
  expect(ambos.error).toBeNull()
  expect(await porDefectoEnLaBase()).toEqual([])
  // Y uno apagado no se marca.
  const marcar = await cliente.rpc('origen_lead_guardar', {
    p_id: origen.id,
    p_actualizado_en_esperado: (await origenEnLaBase(origen.nombre))?.actualizado_en ?? '',
    p_cambios: { por_defecto: true },
  })
  expect(marcar.error?.message).toContain('actívalo antes')
})

test('el alta propone el último origen de la persona, si no el por defecto de la empresa, si no el primero activo', async ({
  page,
}) => {
  const primero = (await sembrarOrigen(nombre('Alta uno'))).id
  const elDeLaEmpresa = await sembrarOrigen(nombre('Alta de la empresa'))
  const elDeLaPersona = await sembrarOrigen(nombre('Alta de la persona'))
  await admin().from('origenes_lead').update({ por_defecto: true }).eq('id', elDeLaEmpresa.id)
  const seleccionado = async () => {
    await abrirConN(page)
    const campo = dialogo(page).getByLabel('Origen del lead')
    const id = await campo.inputValue()
    await page.keyboard.press('Escape')
    await expect(dialogo(page)).toBeHidden()
    return id
  }
  const usuario = await idDe(duena)
  const olvidarElUltimo = () =>
    sql(
      `delete from public.preferencias_usuario where usuario_id = '${usuario}' and clave = 'leads.ultimo_origen_lead'`,
    )
  olvidarElUltimo()

  await entrar(page, duena, { fresco: true })
  await page.goto('/leads')
  // Sin un último origen: el por defecto de la empresa.
  expect(await seleccionado()).toBe(elDeLaEmpresa.id)

  // Con un último origen (activo): ése gana al de la empresa.
  sql(`insert into public.preferencias_usuario (usuario_id, clave, valor) values ('${usuario}', 'leads.ultimo_origen_lead', to_jsonb('${elDeLaPersona.id}'::text))
       on conflict (usuario_id, clave) do update set valor = excluded.valor`)
  await page.goto('/leads')
  expect(await seleccionado()).toBe(elDeLaPersona.id)

  // Si ese origen se apagó, cae en el de la empresa (no en uno al azar, ni se rompe).
  await admin().from('origenes_lead').update({ activo: false }).eq('id', elDeLaPersona.id)
  await page.goto('/leads')
  expect(await seleccionado()).toBe(elDeLaEmpresa.id)

  // Sin por defecto y sin último: el primero activo, como siempre.
  olvidarElUltimo()
  await sinPorDefecto()
  await page.goto('/leads')
  const campo = await seleccionado()
  const activos =
    (
      await admin()
        .from('origenes_lead')
        .select('id')
        .eq('activo', true)
        .order('orden')
        .order('nombre')
    ).data ?? []
  expect(campo).toBe(activos[0]?.id)
  expect(primero.length).toBeGreaterThan(0)
})
