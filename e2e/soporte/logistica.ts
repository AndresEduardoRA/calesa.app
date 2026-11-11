// El terreno de los e2e de logística (6.01): un origen `e2e_…` con una fase, un vehículo en esa fase desde hace 3 días y otro sin fase, y dos personas con rol de prueba:
// una con `logistica.ver` y `vehiculos.ver` del origen y otra con sólo `vehiculos.ver` (la RLS de `vehiculos` pide ésa, no la de logística).
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './origenes'
import { borrarVehiculosDe } from './vehiculos'

export type TerrenoDeLogistica = {
  origen: { id: string; nombre: string; clave: string }
  fase: { id: string; nombre: string }
  enFase: { id: string; titulo: string }
  sinFase: { id: string; titulo: string }
  conLogistica: string
  sinLogistica: string
}

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

const DIAS_EN_LA_FASE = 3

async function crearFase(
  origenId: string,
  nombre: string,
): Promise<{ id: string; nombre: string }> {
  const cliente = admin()
  const { data: flujo, error: errorDeFlujo } = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', origenId)
    .eq('ambito', 'vehiculos')
    .single<{ id: string }>()
  exigir(errorDeFlujo, 'leer el flujo del origen')
  const { data, error } = await cliente
    .from('fases')
    .insert({ flujo_id: flujo?.id ?? '', nombre, orden: 1, es_inicial: true })
    .select('id, nombre')
    .single<{ id: string; nombre: string }>()
  exigir(error, 'crear la fase')
  return { id: data?.id ?? '', nombre }
}

async function cargarVehiculos(
  origenId: string,
  filas: { titulo: string; fase_id?: string; fase_desde?: string }[],
): Promise<Map<string, string>> {
  const { data, error } = await admin()
    .from('vehiculos')
    .insert(filas.map((f) => ({ origen_id: origenId, ...f })))
    .select('id, titulo')
    .returns<{ id: string; titulo: string }[]>()
  exigir(error, 'cargar los vehículos')
  return new Map((data ?? []).map((v) => [v.titulo, v.id]))
}

async function crearPersonaConClaves(
  proyecto: string,
  etiqueta: 'con' | 'sin',
  claves: string[],
  origenId: string,
): Promise<string> {
  const email = correoDePrueba(`${etiqueta}-logistica-${proyecto}`)
  await crearPersona({
    email,
    contrasena: CONTRASENA,
    nombre: `Persona ${etiqueta} logística`,
    invitada: true,
  })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}${etiqueta} logística ${proyecto}`,
      clave: `e2e_${etiqueta}_logistica_${proyecto}`,
    },
    permisos: claves.map((clave) => ({ clave, origenId })),
  })
  return email
}

export async function sembrarLogistica(proyecto: string): Promise<TerrenoDeLogistica> {
  const clave = `logistica_${proyecto}`
  const origen = await crearOrigenDePrueba(`E2E Logística ${proyecto}`, clave)
  const fase = await crearFase(origen.id, `Puerto ${proyecto}`)
  const desde = new Date(Date.now() - DIAS_EN_LA_FASE * 86_400_000).toISOString()
  const tituloEnFase = `E2E Hilux en fase ${proyecto}`
  const tituloSinFase = `E2E Hilux sin fase ${proyecto}`
  const ids = await cargarVehiculos(origen.id, [
    { titulo: tituloEnFase, fase_id: fase.id, fase_desde: desde },
    { titulo: tituloSinFase },
  ])
  return {
    origen: { ...origen, clave },
    fase,
    enFase: { id: ids.get(tituloEnFase) ?? '', titulo: tituloEnFase },
    sinFase: { id: ids.get(tituloSinFase) ?? '', titulo: tituloSinFase },
    conLogistica: await crearPersonaConClaves(
      proyecto,
      'con',
      ['logistica.ver', 'vehiculos.ver'],
      origen.id,
    ),
    sinLogistica: await crearPersonaConClaves(proyecto, 'sin', ['vehiculos.ver'], origen.id),
  }
}

// Quita lo que `sembrarLogistica` creó (los vehículos primero: un origen con vehículos no se borra). Las personas y los roles los limpia el spec con
// `borrarPersonasDePrueba` y `borrarRolesDePrueba`.
export async function borrarLogistica(proyecto: string): Promise<void> {
  const clave = `logistica_${proyecto}`
  await borrarVehiculosDe([`${PREFIJO_CLAVE_E2E}${clave}`])
  await borrarOrigenes([`${PREFIJO_CLAVE_E2E}${clave}`])
}
