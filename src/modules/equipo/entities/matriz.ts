// La matriz de roles × permisos: el catálogo agrupado por módulo y lo que dice cada celda.
// Reglas puras; quien otorga y revoca son las RPC `rbac_*`.
import { z } from 'zod'
import {
  MODULOS_PERMISO,
  esClavePermiso,
  moduloDe,
  type Alcance,
  type ClavePermiso,
  type Concesion,
  type ModuloPermiso,
  type Permisos,
} from '@/shared/lib/permisos'

export type PermisoDelCatalogo = {
  clave: ClavePermiso
  modulo: ModuloPermiso
  nombre: string
  descripcion: string
  // Se puede acotar a un origen (si no, vale para toda la empresa).
  porOrigen: boolean
  // Distingue «lo propio» de «todo».
  conAlcance: boolean
}

export type GrupoDePermisos = {
  modulo: ModuloPermiso
  titulo: string
  permisos: PermisoDelCatalogo[]
}

// Lo que la matriz necesita de un origen. El nombre sale de la fila, nunca de un texto fijo.
export type OrigenDeLaMatriz = { id: string; nombre: string }

export const ETIQUETA_ALCANCE: Record<Alcance, string> = { propios: 'Lo propio', todos: 'Todo' }
export const TODOS_LOS_ORIGENES = 'Todos los orígenes'
export const SIN_ORIGENES = 'Sin orígenes todavía'

const esquemaCatalogo = z.array(
  z.object({
    clave: z.string(),
    nombre: z.string(),
    descripcion: z.string(),
    por_origen: z.boolean(),
    con_alcance: z.boolean(),
  }),
)

// Las filas de la tabla `permisos`, en su orden. Una clave que la base conoce y el catálogo
// tipado no, se descarta: sin su clave en `permisos.ts` nada en la app la consulta.
export function catalogoDesde(filas: unknown): PermisoDelCatalogo[] {
  return esquemaCatalogo.parse(filas).flatMap((fila) =>
    esClavePermiso(fila.clave)
      ? [
          {
            clave: fila.clave,
            modulo: moduloDe(fila.clave),
            nombre: fila.nombre,
            descripcion: fila.descripcion,
            porOrigen: fila.por_origen,
            conAlcance: fila.con_alcance,
          },
        ]
      : [],
  )
}

function esModuloDelCatalogo(valor: string): valor is ModuloPermiso {
  return Object.hasOwn(MODULOS_PERMISO, valor)
}

// Un grupo por módulo, en el orden de `MODULOS_PERMISO`; un módulo sin permisos no aparece.
export function agruparPorModulo(catalogo: readonly PermisoDelCatalogo[]): GrupoDePermisos[] {
  return Object.keys(MODULOS_PERMISO)
    .filter(esModuloDelCatalogo)
    .map((modulo) => ({
      modulo,
      titulo: MODULOS_PERMISO[modulo],
      permisos: catalogo.filter((permiso) => permiso.modulo === modulo),
    }))
    .filter((grupo) => grupo.permisos.length > 0)
}

// Un permiso que no se acota por origen ni distingue alcance es un sí o un no.
export function esSimple(permiso: PermisoDelCatalogo): boolean {
  return !permiso.porOrigen && !permiso.conAlcance
}

export function concesionesDelPermiso(concesiones: Permisos, clave: ClavePermiso): Concesion[] {
  return concesiones.filter((concesion) => concesion.clave === clave)
}

// Dónde se puede dar un permiso: siempre en general y, si se acota por origen, en cada origen.
// Con cero orígenes sólo queda lo general.
export type LugarDeConcesion = { origenId: string | null; etiqueta: string }

export function lugaresDe(
  permiso: PermisoDelCatalogo,
  origenes: readonly OrigenDeLaMatriz[],
): LugarDeConcesion[] {
  const general: LugarDeConcesion = {
    origenId: null,
    etiqueta: permiso.porOrigen ? TODOS_LOS_ORIGENES : 'En toda la empresa',
  }
  if (!permiso.porOrigen) {
    return [general]
  }
  return [general, ...origenes.map((origen) => ({ origenId: origen.id, etiqueta: origen.nombre }))]
}

function conAlcance(permiso: PermisoDelCatalogo, texto: string, alcance: Alcance): string {
  if (!permiso.conAlcance) {
    return texto
  }
  return `${texto} · ${ETIQUETA_ALCANCE[alcance].toLowerCase()}`
}

// Lo que se lee en la celda de un rol para un permiso, sin abrirla.
export function resumenDeCelda(
  permiso: PermisoDelCatalogo,
  delPermiso: readonly Concesion[],
  origenes: readonly OrigenDeLaMatriz[],
): string {
  const general = delPermiso.find((concesion) => concesion.origenId === null)
  if (general) {
    return permiso.conAlcance ? ETIQUETA_ALCANCE[general.alcance] : 'Sí'
  }
  const [unica, ...resto] = delPermiso
  if (!unica) {
    return 'No'
  }
  if (resto.length > 0) {
    return `${String(delPermiso.length)} orígenes`
  }
  // Un origen que ya no está activo no viene en la lista: se dice que hay uno, sin nombrarlo.
  const nombre = origenes.find((origen) => origen.id === unica.origenId)?.nombre ?? 'Un origen'
  return conAlcance(permiso, nombre, unica.alcance)
}
