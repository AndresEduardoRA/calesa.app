// Catálogo de permisos: espejo exacto de la tabla `permisos` que siembra supabase/seed.sql, más los que genera
// `nivel_crear()` (`cotizaciones.nivel.<clave>.ver|editar`, uno por nivel de acceso que la empresa crea).
// Un permiso nuevo es una migración con su policy; acá sólo se agrega la clave.
// permisos.test.ts lee el seed y falla si las dos listas divergen, y comprueba que toda clave que genera la base pasa el patrón de nivel.
//
// La UI esconde o deshabilita con `puede()`; quien decide de verdad es la base (RLS y RPC).
import { z } from 'zod'

export const CLAVES_PERMISO = [
  'equipo.usuarios.ver',
  'equipo.usuarios.gestionar',
  'equipo.roles.ver',
  'equipo.roles.gestionar',
  'empresa.ajustes.gestionar',
  'empresa.tipos_cambio.gestionar',
  'origenes.gestionar',
  'vehiculos.ver',
  'vehiculos.crear',
  'vehiculos.editar',
  'vehiculos.eliminar',
  'vehiculos.vitrina',
  'vehiculos.papelera.purgar',
  'leads.ver',
  'leads.numero_global.ver',
  'leads.crear',
  'leads.editar',
  'leads.compartir',
  'leads.transferir',
  'leads.eliminar',
  'leads.papelera.purgar',
  'leads.portal.gestionar',
  'leads.exportar',
  'leads.configurar',
  'cotizaciones.ver',
  'cotizaciones.crear',
  'cotizaciones.editar',
  'cotizaciones.final.gestionar',
  'cotizaciones.configurar',
  'cotizaciones.moderar',
  'cotizaciones.comprobantes.emitir',
  'flujos.configurar',
  'flujos.mover',
  'flujos.mover.cualquiera',
  'logistica.ver',
  'logistica.documentos.subir',
  'logistica.documentos.aprobar',
  'logistica.transporte.editar',
  'logistica.aduana.gestionar',
  'logistica.gastos.ver',
  'logistica.gastos.editar',
  'logistica.pagos.ver',
  'logistica.pagos.editar',
  'logistica.pagos.confirmar',
  'logistica.margen.ver',
  'logistica.catalogos.gestionar',
  'repuestos.ver',
  'repuestos.editar',
  'repuestos.mover',
  'repuestos.documentos.subir',
  'repuestos.documentos.aprobar',
  'repuestos.costos.ver',
  'repuestos.costos.editar',
  'repuestos.cotizar',
  'repuestos.configurar',
  'agenda.eventos.publicar',
  'agenda.tareas.asignar',
  'agenda.tareas.recibir',
  'agenda.ver_todo',
  'chat.participar',
  'chat.global',
  'chat.moderar',
  'notificaciones.push',
  'actividad.ver',
  'web.contenido.gestionar',
  'web.guias.publicar',
  'web.ajustes.gestionar',
  'web.cola.gestionar',
  'web.cola.participar',
  'tablero.metricas.ver',
  'datos.exportar.todo',
  'datos.importar.todo',
] as const

// Los permisos de un nivel de acceso de la hoja (D7, paso 4.09) no están en la lista: los crea la empresa al crear un nivel, así que se
// reconocen por su forma, la misma que el check de `cotizaciones_niveles.clave` (`^[a-z][a-z0-9_]{1,29}$`) y la de `nivel_crear()`.
// «todos» no genera permisos (usa los de la cotización).
export type ClaveDeNivel = `cotizaciones.nivel.${string}.${'ver' | 'editar'}`

const PATRON_DE_NIVEL = /^cotizaciones\.nivel\.([a-z][a-z0-9_]{1,29})\.(ver|editar)$/
const NIVEL_QUE_NO_GENERA_PERMISOS = 'todos'

// La clave del nivel que nombra un permiso de nivel (`cotizaciones.nivel.costos.ver` → `costos`), o null si no lo es.
export function nivelDeClave(valor: string): string | null {
  const nivel = PATRON_DE_NIVEL.exec(valor)?.[1]
  return nivel === undefined || nivel === NIVEL_QUE_NO_GENERA_PERMISOS ? null : nivel
}

export function esClaveDeNivel(valor: string): valor is ClaveDeNivel {
  return nivelDeClave(valor) !== null
}

export type ClavePermiso = (typeof CLAVES_PERMISO)[number] | ClaveDeNivel

export type Alcance = 'propios' | 'todos'

// Una fila de `mis_permisos()`: un permiso dado a alguno de mis roles.
// `origenId: null` = vale para todos los orígenes.
export type Concesion = { clave: ClavePermiso; origenId: string | null; alcance: Alcance }

export type Permisos = readonly Concesion[]

const CONJUNTO: ReadonlySet<string> = new Set(CLAVES_PERMISO)

export function esClavePermiso(valor: string): valor is ClavePermiso {
  return CONJUNTO.has(valor) || esClaveDeNivel(valor)
}

// Para validar una clave que llega de afuera (una action): la del catálogo o la de un nivel.
export const esquemaClavePermiso = z.custom<ClavePermiso>(
  (valor) => typeof valor === 'string' && esClavePermiso(valor),
  { error: 'Ese permiso no existe.' },
)

// Los niveles se ordenan por nombre, igual en la pantalla de Niveles y en la matriz de Roles: la base ordena con su colación (en una
// base de prueba, «Ñ» queda después de «z»), así que el orden que se ve sale de acá y no del `order by`.
export function compararNombresDeNivel(a: string, b: string): number {
  return a.localeCompare(b, 'es')
}

const esquemaFilas = z.array(
  z.object({
    clave: z.string(),
    // guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
    origen_id: z.guid().nullable(),
    alcance: z.enum(['propios', 'todos']),
  }),
)

// Convierte la respuesta de la RPC `mis_permisos()` en concesiones tipadas. Una clave que la base
// conoce y este archivo no (ni el patrón de un nivel) se descarta: sin su clave en el catálogo nada en la app la consulta.
export function concesionesDe(filas: unknown): Permisos {
  return esquemaFilas
    .parse(filas)
    .flatMap((fila) =>
      esClavePermiso(fila.clave)
        ? [{ clave: fila.clave, origenId: fila.origen_id, alcance: fila.alcance }]
        : [],
    )
}

// Misma condición que `tiene_permiso()` en SQL: sin origen pedido alcanza con tenerlo en
// cualquier origen (sirve para menús); con origen, la concesión tiene que cubrirlo.
function cubre(concesion: Concesion, clave: ClavePermiso, origenId: string | null): boolean {
  return (
    concesion.clave === clave &&
    (concesion.origenId === null || origenId === null || concesion.origenId === origenId)
  )
}

export function puede(permisos: Permisos, clave: ClavePermiso, origenId?: string | null): boolean {
  return permisos.some((c) => cubre(c, clave, origenId ?? null))
}

// Espejo de `alcance_de()`: 'todos' si alguna concesión lo da; si no 'propios'; null si no lo tiene.
export function alcanceDe(
  permisos: Permisos,
  clave: ClavePermiso,
  origenId?: string | null,
): Alcance | null {
  const aplicables = permisos.filter((c) => cubre(c, clave, origenId ?? null))
  if (aplicables.length === 0) {
    return null
  }
  return aplicables.some((c) => c.alcance === 'todos') ? 'todos' : 'propios'
}

// Espejo de `origenes_con_permiso()`: en qué orígenes vale la clave.
export function origenesCon(permisos: Permisos, clave: ClavePermiso): 'todos' | string[] {
  const propias = permisos.filter((c) => c.clave === clave)
  if (propias.some((c) => c.origenId === null)) {
    return 'todos'
  }
  return [...new Set(propias.flatMap((c) => (c.origenId === null ? [] : [c.origenId])))]
}

// El módulo de un permiso es el primer tramo de su clave (`equipo.roles.gestionar` → `equipo`).
type Prefijo<Clave> = Clave extends `${infer Modulo}.${string}` ? Modulo : never
export type ModuloPermiso = Prefijo<ClavePermiso>

// Cómo se llama cada módulo en pantalla. Tipado contra el catálogo: una clave con un módulo nuevo
// no compila hasta que el módulo tenga título acá. El orden es el de la matriz de roles.
export const MODULOS_PERMISO: Record<ModuloPermiso, string> = {
  equipo: 'Equipo',
  empresa: 'Empresa',
  origenes: 'Orígenes',
  vehiculos: 'Vehículos',
  leads: 'Leads',
  cotizaciones: 'Cotizaciones',
  flujos: 'Flujos',
  logistica: 'Logística',
  repuestos: 'Repuestos',
  agenda: 'Agenda',
  chat: 'Chat',
  notificaciones: 'Notificaciones',
  actividad: 'Actividad',
  web: 'Web',
  tablero: 'Tablero',
  datos: 'Datos',
}

function esModulo(valor: string): valor is ModuloPermiso {
  return Object.hasOwn(MODULOS_PERMISO, valor)
}

export function moduloDe(clave: ClavePermiso): ModuloPermiso {
  const modulo = clave.slice(0, clave.indexOf('.'))
  if (!esModulo(modulo)) {
    // Imposible mientras el tipo `ModuloPermiso` salga del catálogo: lo exige el compilador.
    throw new Error(`El permiso ${clave} no tiene módulo.`)
  }
  return modulo
}
