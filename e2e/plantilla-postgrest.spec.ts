import { leerPlantillaSobre } from '../src/modules/cotizaciones/infra/plantilla/lectura-sobre'
import { plantillaSobre } from '../src/modules/cotizaciones/infra/plantilla/rpc-de-la-plantilla'
import { validarPlantilla } from '../src/modules/cotizaciones/entities/plantilla/validar-plantilla'
import { expect, test } from './soporte/prueba'
import {
  limpiarTerrenoDePlantilla,
  plantillaValida,
  prepararTerrenoDePlantilla,
  type TerrenoDePlantilla,
} from './soporte/plantilla'

// @sin-celular-archivo: no abre ninguna página: prueba lo que lee y escribe la plantilla de la tarjeta contra el PostgREST de verdad, con la sesión de cada persona

// Lo que lee y escribe el editor de la plantilla de la tarjeta (4.19-3a), sin pantalla: `leerPlantillaSobre()` y `plantillaSobre()` de `src` (sin `server-only`) con la sesión de
// la dueña y la de una asesora, contra las tablas y las RPC del 4.19-1. Corre con `E2E_SIN_FUNCIONES=1`: no llama a ninguna función edge.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDePlantilla | undefined
const terreno = () => {
  if (!t) throw new Error('No hay terreno.')
  return t
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  t = await prepararTerrenoDePlantilla(info.project.name)
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarTerrenoDePlantilla()
})

async function leer() {
  const { origenId, duena } = terreno()
  const r = await leerPlantillaSobre(duena, origenId)
  if (!r.ok) throw new Error(r.error.mensaje)
  return r.data
}

const repositorio = () => plantillaSobre(terreno().duena)

test('E1: crear con la esperada nula, leer la misma hora con sus microsegundos y guardar con ella', async () => {
  const { origenId } = terreno()
  const antes = await leer()
  expect(antes.borrador).toBeNull()
  expect(antes.publicada).toBeNull()
  expect(antes.formula).not.toBeNull()
  expect(antes.tonos.length).toBeGreaterThan(0)

  const creado = await repositorio().guardar({
    origenId,
    esperada: null,
    definicion: plantillaValida('uno'),
  })
  if (!creado.ok) throw new Error(creado.error.mensaje)
  const leido = await leer()
  expect(leido.borrador?.actualizadoEn).toBe(creado.data)
  expect(creado.data).toMatch(/\.\d{6}/)
  expect(leido.borrador?.plantilla?.nota).toBe('Nota uno')

  const guardado = await repositorio().guardar({
    origenId,
    esperada: creado.data,
    definicion: plantillaValida('dos'),
  })
  if (!guardado.ok) throw new Error(guardado.error.mensaje)
  expect(guardado.data).not.toBe(creado.data)
  expect((await leer()).borrador?.plantilla?.nota).toBe('Nota dos')
})

test('E2: guardar con la esperada vieja, o crear otra vez con nula, es un conflicto que no pisa nada', async () => {
  const { origenId } = terreno()
  const antes = await leer()
  const vigente = antes.borrador?.actualizadoEn ?? ''
  const vieja = vigente.replace(/\.\d+/, '.000001')
  expect(vieja).not.toBe(vigente)

  const viejaR = await repositorio().guardar({
    origenId,
    esperada: vieja,
    definicion: plantillaValida('pisa'),
  })
  expect(viejaR).toMatchObject({ ok: false, error: { codigo: 'conflicto' } })
  expect(!viejaR.ok && viejaR.error.mensaje).toContain('El borrador de esta plantilla cambió')

  const nulaR = await repositorio().guardar({
    origenId,
    esperada: null,
    definicion: plantillaValida('pisa'),
  })
  expect(nulaR).toMatchObject({ ok: false, error: { codigo: 'conflicto' } })
  expect(!nulaR.ok && nulaR.error.mensaje).toContain('Ya hay un borrador')

  const despues = await leer()
  expect(despues.borrador?.actualizadoEn).toBe(vigente)
  expect(despues.borrador?.plantilla?.nota).toBe('Nota dos')
})

test('E3: un rechazo va al campo que dice la base: la forma al guardar, lo de la fórmula al publicar, la nota en blanco al campo nota', async () => {
  const { origenId } = terreno()
  const antes = await leer()
  let vigente = antes.borrador?.actualizadoEn ?? ''
  const buena = plantillaValida('tres')
  // Guardar sólo mira la forma (sin contexto); lo que cruza con la fórmula y los tonos se mira al publicar.
  for (const definicion of [
    { ...buena, grupos: 'no' },
    { ...buena, total: { etiqueta: '' } },
  ]) {
    const esperado = validarPlantilla(definicion, null)
    if (esperado.ok) throw new Error('El caso tenía que ser inválido.')
    const r = await repositorio().guardar({ origenId, esperada: vigente, definicion })
    expect(r).toMatchObject({ ok: false, error: { codigo: 'regla' } })
    // Lo mismo que dice TS: el `donde` y el mensaje de la base son los de `validarPlantilla()`.
    expect(!r.ok && r.porCampo).toEqual({ [esperado.error.donde]: esperado.error.mensaje })
  }
  expect((await leer()).borrador?.actualizadoEn).toBe(vigente)

  const conGrupoAjeno = { ...buena, grupos: [...buena.grupos, { grupo: 'no_es_de_la_formula' }] }
  const esperado = validarPlantilla(conGrupoAjeno, antes.contexto)
  if (esperado.ok) throw new Error('El caso tenía que ser inválido.')
  const guardado = await repositorio().guardar({
    origenId,
    esperada: vigente,
    definicion: conGrupoAjeno,
  })
  if (!guardado.ok) throw new Error(guardado.error.mensaje)
  vigente = guardado.data
  const alPublicar = await repositorio().publicar({ origenId, esperada: vigente, nota: 'Va' })
  expect(alPublicar).toMatchObject({ ok: false, error: { codigo: 'regla' } })
  expect(!alPublicar.ok && alPublicar.porCampo).toEqual({
    [esperado.error.donde]: esperado.error.mensaje,
  })

  // Se deja un borrador bueno, y publicar con la nota en blanco la pide en su campo.
  const bueno = await repositorio().guardar({ origenId, esperada: vigente, definicion: buena })
  if (!bueno.ok) throw new Error(bueno.error.mensaje)
  const sinNota = await repositorio().publicar({ origenId, esperada: bueno.data, nota: '' })
  expect(sinNota).toMatchObject({ ok: false, porCampo: { nota: 'Publicar pide una nota.' } })
})

test('E5: una persona que no configura el origen no lee nada de la plantilla y no puede escribirla', async () => {
  const { origenId, asesora } = terreno()
  const vigente = (await leer()).borrador?.actualizadoEn ?? ''
  const r = await leerPlantillaSobre(asesora, origenId)
  if (!r.ok) throw new Error(r.error.mensaje)
  expect(r.data.borrador).toBeNull()
  expect(r.data.publicada).toBeNull()
  expect(r.data.formula).toBeNull()
  expect(r.data.contexto).toBeNull()
  expect(r.data.tonos.length).toBeGreaterThan(0)

  const suya = plantillaSobre(asesora)
  const definicion = plantillaValida('ajena')
  for (const hecho of [
    await suya.guardar({ origenId, esperada: vigente, definicion }),
    await suya.publicar({ origenId, esperada: vigente, nota: 'No debería' }),
    await suya.descartar({ origenId, esperada: vigente }),
  ]) {
    expect(hecho).toMatchObject({ ok: false, error: { codigo: 'sin_permiso' } })
  }
  expect((await leer()).borrador?.actualizadoEn).toBe(vigente)
})

test('E4: publicar con nota entra y deja la publicada sin borrador; descartar con la esperada vieja es un conflicto', async () => {
  const { origenId } = terreno()
  const vigente = (await leer()).borrador?.actualizadoEn ?? ''
  const publicada = await repositorio().publicar({ origenId, esperada: vigente, nota: 'Primera' })
  if (!publicada.ok) throw new Error(publicada.error.mensaje)
  const despues = await leer()
  expect(despues.borrador).toBeNull()
  expect(despues.publicada).toMatchObject({ id: publicada.data, version: 1, nota: 'Primera' })

  const descartar = await repositorio().descartar({ origenId, esperada: vigente })
  expect(descartar).toMatchObject({ ok: false, error: { codigo: 'conflicto' } })
  expect(!descartar.ok && descartar.error.mensaje).toContain('El borrador ya no está')
})

test('E6: sin la guarda, un surrogate suelto y un `\\u0000` llegan a la base y vuelven como «inesperado»', async () => {
  const { origenId } = terreno()
  for (const nota of ['medio emoji \uD83D', 'un nulo \u0000 adentro']) {
    const r = await repositorio().guardar({
      origenId,
      esperada: null,
      definicion: { ...plantillaValida('x'), nota },
    })
    // Si la base cambia y los acepta, este caso cae y `revisarTextoParaLaBase()` se revisa.
    expect(r).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
  }
  expect((await leer()).borrador).toBeNull()
})
