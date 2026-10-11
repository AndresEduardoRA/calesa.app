// Catálogo de permisos: espejo exacto de la tabla `permisos` que siembra supabase/seed.sql.
// Un permiso nuevo es una migración con su policy; acá sólo se agrega la clave.
// permisos.test.ts lee el seed y falla si las dos listas divergen.
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
  'leads.crear',
  'leads.editar',
  'leads.compartir',
  'leads.transferir',
  'leads.eliminar',
  'leads.portal.gestionar',
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
  'tablero.metricas.ver',
  'datos.exportar.todo',
  'datos.importar.todo',
] as const

export type ClavePermiso = (typeof CLAVES_PERMISO)[number]

export type Alcance = 'propios' | 'todos'

// Una fila de `mis_permisos()`: un permiso dado a alguno de mis roles.
// `origenId: null` = vale para todos los orígenes.
export type Concesion = { clave: ClavePermiso; origenId: string | null; alcance: Alcance }

export type Permisos = readonly Concesion[]

const CONJUNTO: ReadonlySet<string> = new Set(CLAVES_PERMISO)

export function esClavePermiso(valor: string): valor is ClavePermiso {
  return CONJUNTO.has(valor)
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
// conoce y este archivo no se descarta: sin su clave en el catálogo nada en la app la consulta.
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
