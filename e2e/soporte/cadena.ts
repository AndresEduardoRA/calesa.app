// El terreno de los e2e de la cadena de logística (6.03): tres orígenes `e2e_…` con la logística encendida (la regla va encendida por omisión al crear el flujo) y una persona con `logistica.ver` y
// `vehiculos.ver` en dos de ellos, no en el tercero.
//   A: tres fases (la 2.ª con `demora_dias = 1`) y cinco vehículos con VIN: uno sin fase, uno en la 1.ª, dos en la 2.ª (uno desde hace 3 días: demorado) y uno en la 3.ª con contenedor y ETA.
//   B: una fase con 51 vehículos (una página de 50 y uno más): el camino de «Ver más».
//   C: el origen vecino, sin permisos de la persona.
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './origenes'
import { borrarVehiculosDe } from './vehiculos'

type Origen = { id: string; nombre: string; clave: string }
type Unidad = { id: string; titulo: string; vin: string | null }

export type TerrenoDeLaCadena = {
  a: Origen
  b: Origen
  c: Origen
  fases: { puerto: string; transito: string; entrega: string; cola: string }
  sinFase: Unidad
  enPuerto: Unidad
  demorado: Unidad
  reciente: Unidad
  conTransporte: Unidad
  contenedor: string
  persona: string
}

const DIA = 86_400_000
export const CANTIDAD_EN_LA_COLA = 51

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

const claveDe = (letra: string, proyecto: string) => `cadena_${letra}_${proyecto}`

async function crearFase(
  origenId: string,
  fase: { nombre: string; orden: number; demora_dias?: number; es_inicial?: boolean },
): Promise<string> {
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
    .insert({ flujo_id: flujo?.id ?? '', ...fase })
    .select('id')
    .single<{ id: string }>()
  exigir(error, 'crear la fase')
  return data?.id ?? ''
}

type Fila = { titulo: string; vin?: string; fase_id?: string; fase_desde?: string }

async function cargarVehiculos(origenId: string, filas: Fila[]): Promise<Map<string, string>> {
  const { data, error } = await admin()
    .from('vehiculos')
    .insert(filas.map((f) => ({ origen_id: origenId, ...f })))
    .select('id, titulo')
    .returns<{ id: string; titulo: string }[]>()
  exigir(error, 'cargar los vehículos')
  return new Map((data ?? []).map((v) => [v.titulo, v.id]))
}

async function crearLaPersona(proyecto: string, origenes: string[]): Promise<string> {
  const email = correoDePrueba(`cadena-${proyecto}`)
  await crearPersona({
    email,
    contrasena: CONTRASENA,
    nombre: 'Persona de la cadena',
    invitada: true,
  })
  await darRolDePrueba({
    email,
    rol: { nombre: `${PREFIJO_ROL_E2E}cadena ${proyecto}`, clave: `e2e_cadena_${proyecto}` },
    permisos: origenes.flatMap((origenId) =>
      ['logistica.ver', 'vehiculos.ver'].map((clave) => ({ clave, origenId })),
    ),
  })
  return email
}

// Un VIN de 13 caracteres sin I, O ni Q: `CADE` + el proyecto en dos letras + un número de seis cifras.
const vinDe = (proyecto: string, n: number): string =>
  `CADE${proyecto === 'celular' ? 'CE' : 'ES'}${String(n).padStart(6, '9')}`

export async function sembrarCadena(proyecto: string): Promise<TerrenoDeLaCadena> {
  const origen = async (letra: string, nombre: string): Promise<Origen> => {
    const clave = claveDe(letra, proyecto)
    const creado = await crearOrigenDePrueba(`E2E Cadena ${nombre} ${proyecto}`, clave)
    return { ...creado, clave }
  }
  const a = await origen('a', 'A')
  const b = await origen('b', 'B')
  const c = await origen('c', 'C')
  const puerto = await crearFase(a.id, { nombre: `Puerto ${proyecto}`, orden: 1, es_inicial: true })
  const transito = await crearFase(a.id, {
    nombre: `Tránsito ${proyecto}`,
    orden: 2,
    demora_dias: 1,
  })
  const entrega = await crearFase(a.id, { nombre: `Entrega ${proyecto}`, orden: 3 })
  const cola = await crearFase(b.id, { nombre: `Cola ${proyecto}`, orden: 1, es_inicial: true })
  const hace = (dias: number) => new Date(Date.now() - dias * DIA).toISOString()
  const titulos = {
    sinFase: `E2E Cadena sin fase ${proyecto}`,
    enPuerto: `E2E Cadena en puerto ${proyecto}`,
    demorado: `E2E Cadena demorado ${proyecto}`,
    reciente: `E2E Cadena reciente ${proyecto}`,
    conTransporte: `E2E Cadena con contenedor ${proyecto}`,
  }
  const ids = await cargarVehiculos(a.id, [
    { titulo: titulos.sinFase, vin: vinDe(proyecto, 1) },
    { titulo: titulos.enPuerto, vin: vinDe(proyecto, 2), fase_id: puerto, fase_desde: hace(1) },
    { titulo: titulos.demorado, vin: vinDe(proyecto, 3), fase_id: transito, fase_desde: hace(3) },
    { titulo: titulos.reciente, vin: vinDe(proyecto, 4), fase_id: transito, fase_desde: hace(0) },
    {
      titulo: titulos.conTransporte,
      vin: vinDe(proyecto, 5),
      fase_id: entrega,
      fase_desde: hace(2),
    },
  ])
  const unidad = (clave: keyof typeof titulos, n: number): Unidad => ({
    id: ids.get(titulos[clave]) ?? '',
    titulo: titulos[clave],
    vin: vinDe(proyecto, n),
  })
  const conTransporte = unidad('conTransporte', 5)
  const contenedor = `ECMU${proyecto === 'celular' ? '7' : '8'}654321`
  const { error } = await admin()
    .from('transportes')
    .insert({ vehiculo_id: conTransporte.id, contenedor, eta_el: '2026-12-15' })
  exigir(error, 'crear el transporte')
  // La cola: 51 vehículos, el más antiguo primero; el último (el más nuevo en la fase) queda fuera de la primera página.
  await cargarVehiculos(
    b.id,
    Array.from({ length: CANTIDAD_EN_LA_COLA }, (_, i) => ({
      titulo: `E2E Cola ${String(i + 1).padStart(2, '0')} ${proyecto}`,
      fase_id: cola,
      fase_desde: new Date(Date.now() - (CANTIDAD_EN_LA_COLA + 1 - i) * 60_000).toISOString(),
    })),
  )
  return {
    a,
    b,
    c,
    fases: { puerto, transito, entrega, cola },
    sinFase: unidad('sinFase', 1),
    enPuerto: unidad('enPuerto', 2),
    demorado: unidad('demorado', 3),
    reciente: unidad('reciente', 4),
    conTransporte,
    contenedor,
    persona: await crearLaPersona(proyecto, [a.id, b.id]),
  }
}

// Quita lo que `sembrarCadena` creó (los vehículos primero: un origen con vehículos no se borra). Las personas y los roles los limpia el spec.
export async function borrarCadena(proyecto: string): Promise<void> {
  const claves = ['a', 'b', 'c'].map((letra) => `${PREFIJO_CLAVE_E2E}${claveDe(letra, proyecto)}`)
  await borrarVehiculosDe(claves)
  await borrarOrigenes(claves)
}
