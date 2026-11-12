// El terreno de los e2e de mover (6.04): un origen `e2e_…` con tres fases y dos personas con `flujos.mover`, `logistica.ver` y `vehiculos.ver` del origen.
//   A → B (B pide nota interna) y B → C (C pide un documento bloqueante «E2E BL <proyecto>»). Un vehículo en A y otro en B, los dos desde hace dos días.
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './origenes'
import { borrarVehiculosDe } from './vehiculos'

type Fase = { id: string; nombre: string }
type Unidad = { id: string; titulo: string }

export type TerrenoDeMover = {
  origen: { id: string; nombre: string; clave: string }
  a: Fase
  b: Fase
  c: Fase
  tipoDeBl: { id: string; nombre: string }
  enA: Unidad
  enB: Unidad
  primera: { correo: string; nombre: string }
  segunda: { correo: string; nombre: string }
}

const DIA = 86_400_000

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

const claveDe = (proyecto: string) => `mover_${proyecto}`

async function flujoDelOrigen(origenId: string): Promise<string> {
  const { data, error } = await admin()
    .from('flujos')
    .select('id')
    .eq('origen_id', origenId)
    .eq('ambito', 'vehiculos')
    .single<{ id: string }>()
  exigir(error, 'leer el flujo del origen')
  return data?.id ?? ''
}

async function crearFase(
  flujoId: string,
  fase: { nombre: string; orden: number; es_inicial?: boolean; nota_obligatoria?: boolean },
): Promise<Fase> {
  const { data, error } = await admin()
    .from('fases')
    .insert({ flujo_id: flujoId, ...fase })
    .select('id, nombre')
    .single<Fase>()
  exigir(error, 'crear la fase')
  return { id: data?.id ?? '', nombre: fase.nombre }
}

async function crearPersonaQueMueve(
  proyecto: string,
  etiqueta: string,
  nombre: string,
  origenId: string,
): Promise<{ correo: string; nombre: string }> {
  const correo = correoDePrueba(`${etiqueta}-mover-${proyecto}`)
  await crearPersona({ email: correo, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email: correo,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}${etiqueta} mover ${proyecto}`,
      clave: `e2e_${etiqueta}_mover_${proyecto}`,
    },
    permisos: ['logistica.ver', 'vehiculos.ver', 'flujos.mover'].map((clave) => ({
      clave,
      origenId,
    })),
  })
  return { correo, nombre }
}

export async function sembrarMover(proyecto: string): Promise<TerrenoDeMover> {
  const clave = claveDe(proyecto)
  const creado = await crearOrigenDePrueba(`E2E Mover ${proyecto}`, clave)
  const flujoId = await flujoDelOrigen(creado.id)
  const a = await crearFase(flujoId, { nombre: `Origen ${proyecto}`, orden: 1, es_inicial: true })
  const b = await crearFase(flujoId, {
    nombre: `Embarcado ${proyecto}`,
    orden: 2,
    nota_obligatoria: true,
  })
  const c = await crearFase(flujoId, { nombre: `Entregado ${proyecto}`, orden: 3 })
  const cliente = admin()
  const { error: errorDeSalidas } = await cliente.from('fases_transiciones').insert([
    { flujo_id: flujoId, de_fase_id: a.id, a_fase_id: b.id },
    { flujo_id: flujoId, de_fase_id: b.id, a_fase_id: c.id },
  ])
  exigir(errorDeSalidas, 'crear las salidas')
  const nombreDelTipo = `E2E BL ${proyecto}`
  const { data: tipo, error: errorDelTipo } = await cliente
    .from('tipos_documento')
    .insert({ flujo_id: flujoId, nombre: nombreDelTipo, orden: 1 })
    .select('id')
    .single<{ id: string }>()
  exigir(errorDelTipo, 'crear el tipo de documento')
  const { error: errorDelRequisito } = await cliente.from('fases_requisitos').insert({
    fase_id: c.id,
    tipo: 'documento',
    tipo_documento_id: tipo?.id ?? '',
    bloqueante: true,
    orden: 1,
  })
  exigir(errorDelRequisito, 'crear el requisito')
  const titulos = { enA: `E2E Mover en A ${proyecto}`, enB: `E2E Mover en B ${proyecto}` }
  const hace2 = new Date(Date.now() - 2 * DIA).toISOString()
  const { data: vehiculos, error: errorDeVehiculos } = await cliente
    .from('vehiculos')
    .insert([
      { origen_id: creado.id, titulo: titulos.enA, fase_id: a.id, fase_desde: hace2 },
      { origen_id: creado.id, titulo: titulos.enB, fase_id: b.id, fase_desde: hace2 },
    ])
    .select('id, titulo')
    .returns<Unidad[]>()
  exigir(errorDeVehiculos, 'cargar los vehículos')
  const id = (titulo: string) => vehiculos?.find((v) => v.titulo === titulo)?.id ?? ''
  return {
    origen: { ...creado, clave },
    a,
    b,
    c,
    tipoDeBl: { id: tipo?.id ?? '', nombre: nombreDelTipo },
    enA: { id: id(titulos.enA), titulo: titulos.enA },
    enB: { id: id(titulos.enB), titulo: titulos.enB },
    primera: await crearPersonaQueMueve(proyecto, 'primera', 'Primera Mueve', creado.id),
    segunda: await crearPersonaQueMueve(proyecto, 'segunda', 'Rosa Mamani', creado.id),
  }
}

// Aprueba por la base el documento del tipo «BL» de un vehículo: lo que haría 6.06 con la aprobación. Nadie nace aprobado (el trigger `documento_sellos`): nace subido y se aprueba después.
export async function aprobarElBl(terreno: TerrenoDeMover, vehiculoId: string): Promise<void> {
  const cliente = admin()
  const { data, error } = await cliente
    .from('documentos')
    .insert({
      vehiculo_id: vehiculoId,
      tipo_documento_id: terreno.tipoDeBl.id,
      nombre_archivo: 'bl.pdf',
      mime: 'application/pdf',
    })
    .select('id')
    .single<{ id: string }>()
  exigir(error, 'subir el documento')
  const { error: errorAlAprobar } = await cliente
    .from('documentos')
    .update({ estado: 'aprobado' })
    .eq('id', data?.id ?? '')
  exigir(errorAlAprobar, 'aprobar el documento')
}

export type LoteSembrado = {
  contenedor: string
  // Los ocho del contenedor, todos en B: los siete primeros con el BL aprobado, el último sin él.
  delContenedor: Unidad[]
  sinBl: Unidad
  // Una unidad en B con el BL aprobado y sin contenedor: la que elige la prueba de las casillas.
  suelta: Unidad
}

// El terreno del lote (6.04-3), sobre el de `sembrarMover`: ocho vehículos en B con el mismo contenedor (`transportes.contenedor`), siete con el BL aprobado y uno sin él (B → C pide el BL), y una
// suelta en B con el BL aprobado. Todos desde hace dos días.
export async function sembrarLote(
  terreno: TerrenoDeMover,
  proyecto: string,
): Promise<LoteSembrado> {
  const cliente = admin()
  const hace2 = new Date(Date.now() - 2 * DIA).toISOString()
  const titulo = (n: number) => `E2E Lote ${String(n)} ${proyecto}`
  const titulos = [...Array.from({ length: 8 }, (_, i) => titulo(i + 1)), `E2E Suelta ${proyecto}`]
  const { data, error } = await cliente
    .from('vehiculos')
    .insert(
      titulos.map((t) => ({
        origen_id: terreno.origen.id,
        titulo: t,
        fase_id: terreno.b.id,
        fase_desde: hace2,
      })),
    )
    .select('id, titulo')
    .returns<Unidad[]>()
  exigir(error, 'cargar los vehículos del lote')
  const unidad = (t: string): Unidad => ({
    id: data?.find((v) => v.titulo === t)?.id ?? '',
    titulo: t,
  })
  const delContenedor = titulos.slice(0, 8).map(unidad)
  const contenedor = `ELOTE${proyecto.toUpperCase().slice(0, 3)}${String(Date.now()).slice(-6)}`
  const { error: errorDeTransportes } = await cliente
    .from('transportes')
    .insert(delContenedor.map((u) => ({ vehiculo_id: u.id, contenedor })))
  exigir(errorDeTransportes, 'crear los transportes del lote')
  const sinBl = delContenedor[7] ?? { id: '', titulo: '' }
  const suelta = unidad(`E2E Suelta ${proyecto}`)
  for (const u of [...delContenedor.slice(0, 7), suelta]) {
    await aprobarElBl(terreno, u.id)
  }
  return { contenedor, delContenedor, sinBl, suelta }
}

// Quita lo que `sembrarMover` creó (los vehículos primero: un origen con vehículos no se borra; los documentos caen con ellos). Las personas y los roles los limpia el spec.
export async function borrarMover(proyecto: string): Promise<void> {
  const clave = `${PREFIJO_CLAVE_E2E}${claveDe(proyecto)}`
  await borrarVehiculosDe([clave])
  await borrarOrigenes([clave])
}
