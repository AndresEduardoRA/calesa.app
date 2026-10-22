// Un rol: un conjunto de permisos con nombre, creado por quien administra. `dueno` es de sistema.
import { z } from 'zod'
import {
  TOPE_DEL_CONTEO,
  conteoAcotado,
  conteoEnFrase,
  type ConteoAcotado,
} from '@/shared/lib/conteo'
import { concesionesDe, type Permisos } from '@/shared/lib/permisos'
import { MOTIVO_ROL_NO_DOMINADO } from './dominancia'

export type Rol = {
  id: string
  clave: string
  nombre: string
  color: string | null
  // Los de sistema no se eliminan.
  esSistema: boolean
  // ISO. La versión del rol: cubre su nombre y sus concesiones. La mandan de vuelta las ediciones.
  actualizadoEn: string
}

export type RolConConcesiones = Rol & {
  concesiones: Permisos
  // Cuántas personas lo tienen, hasta `TOPE_DEL_CONTEO` («más de 1.000», 5a-27): con alguna adentro no se elimina.
  personas: ConteoAcotado
}

// Los colores entre los que se elige al crear un rol. El elegido se guarda en la fila y de ahí
// sale siempre: ningún componente decide el color de un rol por su nombre.
export const COLORES_DE_ROL = [
  { valor: '#465fff', nombre: 'Azul' },
  { valor: '#027a48', nombre: 'Verde' },
  { valor: '#c7680a', nombre: 'Naranja' },
  { valor: '#7a5af8', nombre: 'Violeta' },
  { valor: '#d92d20', nombre: 'Rojo' },
  { valor: '#0e7090', nombre: 'Turquesa' },
  { valor: '#667085', nombre: 'Gris' },
] as const

const LARGO_MAXIMO_CLAVE = 41

// La clave de un rol a partir de su nombre, con la forma que exige la base
// (`^[a-z][a-z0-9_]{1,40}$`): minúsculas, sin acentos, guiones bajos. «Jefa de Ventas» →
// `jefa_de_ventas`. Devuelve null si del nombre no sale una clave válida («123», «¡!»).
export function claveDeRol(nombre: string): string | null {
  const clave = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .slice(0, LARGO_MAXIMO_CLAVE)
    .replace(/_+$/, '')
  return clave.length >= 2 ? clave : null
}

const esquemaRoles = z.array(
  z.object({
    // guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
    id: z.guid(),
    clave: z.string(),
    nombre: z.string(),
    color: z.string().nullable(),
    es_sistema: z.boolean(),
    actualizado_en: z.string(),
    roles_permisos: z.array(z.object({ permiso_clave: z.string() }).loose()),
  }),
)

// Lo que devuelve `roles_personas()`: una fila por rol con sus personas contadas hasta `TOPE_DEL_CONTEO + 1`.
const esquemaPersonasPorRol = z.array(z.object({ rol_id: z.guid(), personas: z.number().int() }))

// Las filas de `roles` con sus concesiones, y cuántas personas tiene cada uno según `roles_personas()` (así las lee infra). Un rol que no vino en la
// cuenta (se creó entre las dos lecturas) no tiene a nadie.
export function rolesDesde(filas: unknown, personasPorRol: unknown): RolConConcesiones[] {
  const personas = new Map(
    esquemaPersonasPorRol.parse(personasPorRol).map((fila) => [fila.rol_id, fila.personas]),
  )
  return esquemaRoles.parse(filas).map((fila) => ({
    id: fila.id,
    clave: fila.clave,
    nombre: fila.nombre,
    color: fila.color,
    esSistema: fila.es_sistema,
    actualizadoEn: fila.actualizado_en,
    concesiones: concesionesDe(
      fila.roles_permisos.map(({ permiso_clave, ...resto }) => ({
        ...resto,
        clave: permiso_clave,
      })),
    ),
    personas: conteoAcotado(personas.get(fila.id) ?? 0, TOPE_DEL_CONTEO),
  }))
}

// La versión más nueva entre la que llegó con la pantalla y la que devolvió la última edición.
// Las dos son ISO de la misma base (mismo huso y precisión): se comparan como texto.
export function versionMasNueva(a: string, b: string | undefined): string {
  return b !== undefined && b > a ? b : a
}

// Por qué un rol no se puede eliminar, o null si se puede. La base lo vuelve a decidir.
export function motivoDeNoEliminar(
  rol: Pick<RolConConcesiones, 'esSistema' | 'personas'>,
  dominado: boolean,
): string | null {
  if (rol.esSistema) {
    return 'Un rol de sistema no se elimina.'
  }
  if (!dominado) {
    return MOTIVO_ROL_NO_DOMINADO
  }
  if (rol.personas.n > 0) {
    return 'Quítaselo a las personas que lo tienen antes de eliminarlo.'
  }
  return null
}

// «Nadie lo tiene», «1 persona», «37 personas» o «más de 1.000 personas»: nunca el total exacto (5a-27).
export function personasConElRol(conteo: ConteoAcotado): string {
  if (!conteo.hayMas && conteo.n === 0) {
    return 'Nadie lo tiene'
  }
  if (!conteo.hayMas && conteo.n === 1) {
    return '1 persona'
  }
  return `${conteoEnFrase(conteo)} personas`
}
