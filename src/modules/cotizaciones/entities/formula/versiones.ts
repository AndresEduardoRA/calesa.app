// Las versiones de la fórmula de un origen, como las lee Configuración › Cotización › «Fórmula» (4.20-2a): la publicada, el borrador y la lista de las publicadas y
// archivadas, de la más nueva a la más vieja, por cursor sobre `formulas_origen_id_version_key (origen_id, version)`. Lo oculto (`definicion`, `params`, `diseno`,
// `visibilidad`) nunca viaja: los esquemas son estrictos y una fila con una columna de más es un error de lectura, no una fila.
import { z } from 'zod'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'

// Las columnas de una fila de la lista y las del estado (la publicada y el borrador).
export const COLUMNAS_DE_VERSION = 'id, version, estado, nota, publicado_por, publicado_en'
export const COLUMNAS_DEL_ESTADO =
  'id, version, estado, nota, creado_por, publicado_por, publicado_en, actualizado_en, version_origen_id'

// El número de versión es un `integer` de Postgres: el cursor de «Ir a la versión» (N + 1) tiene que caber.
export const MAXIMA_VERSION = 2_147_483_646

const esquemaDeVersion = z.strictObject({
  id: z.guid(),
  version: z.number().int().positive(),
  estado: z.enum(['publicada', 'archivada']),
  nota: z.string().nullable(),
  publicado_por: z.guid().nullable(),
  publicado_en: z.string().nullable(),
})

const esquemaDelEstado = z.strictObject({
  id: z.guid(),
  version: z.number().int().positive().nullable(),
  estado: z.enum(['borrador', 'publicada']),
  nota: z.string().nullable(),
  creado_por: z.guid().nullable(),
  publicado_por: z.guid().nullable(),
  publicado_en: z.string().nullable(),
  actualizado_en: z.string(),
  version_origen_id: z.guid().nullable(),
})

export type VersionDeLaFormula = {
  id: string
  version: number
  estado: 'publicada' | 'archivada'
  nota: string | null
  publicadoPor: string | null
  publicadoEn: string | null
}

export type PublicadaDelOrigen = {
  id: string
  version: number
  nota: string | null
  publicadoPor: string | null
  publicadoEn: string | null
}

export type BorradorDelOrigen = {
  id: string
  nota: string | null
  creadoPor: string | null
  actualizadoEn: string
  versionOrigenId: string | null
  // El número de la versión sobre la que empezó, si todavía existe.
  versionDeOrigen: number | null
}

export type EstadoDeLaFormula = {
  publicada: PublicadaDelOrigen | null
  borrador: BorradorDelOrigen | null
}

// Una página de la lista: las versiones que se ven, si hay más y desde qué número seguir (el de la última que se ve).
export type PaginaDeVersiones = {
  filas: VersionDeLaFormula[]
  siguiente: number | null
}

// Lo que dibuja la pantalla: cada fila con el nombre de quien la publicó.
export type ConAutor<T> = T & { autor: string }

export type PaginaConAutores = {
  filas: ConAutor<VersionDeLaFormula>[]
  siguiente: number | null
}

// Lo que la pestaña «Fórmula» lee de un origen en el servidor.
export type FormulaDelOrigen = {
  publicada: ConAutor<PublicadaDelOrigen> | null
  borrador: ConAutor<BorradorDelOrigen> | null
  versiones: PaginaConAutores
}

export function versionesDesde(filas: unknown): VersionDeLaFormula[] | null {
  const leidas = z.array(esquemaDeVersion).safeParse(filas)
  if (!leidas.success) {
    return null
  }
  return leidas.data.map((fila) => ({
    id: fila.id,
    version: fila.version,
    estado: fila.estado,
    nota: fila.nota,
    publicadoPor: fila.publicado_por,
    publicadoEn: fila.publicado_en,
  }))
}

// La publicada y el borrador de un origen (a lo sumo una de cada una: `formulas_publicada_unica` y `formulas_borrador_unico`).
export function estadoDesde(filas: unknown): EstadoDeLaFormula | null {
  const leidas = z.array(esquemaDelEstado).max(2).safeParse(filas)
  if (!leidas.success) {
    return null
  }
  let publicada: PublicadaDelOrigen | null = null
  let borrador: BorradorDelOrigen | null = null
  for (const fila of leidas.data) {
    if (fila.estado === 'publicada' && fila.version !== null) {
      publicada = {
        id: fila.id,
        version: fila.version,
        nota: fila.nota,
        publicadoPor: fila.publicado_por,
        publicadoEn: fila.publicado_en,
      }
    } else if (fila.estado === 'borrador') {
      borrador = {
        id: fila.id,
        nota: fila.nota,
        creadoPor: fila.creado_por,
        actualizadoEn: fila.actualizado_en,
        versionOrigenId: fila.version_origen_id,
        versionDeOrigen: null,
      }
    } else {
      return null
    }
  }
  if (borrador && publicada && borrador.versionOrigenId === publicada.id) {
    borrador = { ...borrador, versionDeOrigen: publicada.version }
  }
  return { publicada, borrador }
}

// La versión de origen de un borrador que hay que leer aparte: la que no es la publicada (el borrador está atrasado). Sin ella, nada que leer.
export function versionDeOrigenPorLeer(estado: EstadoDeLaFormula): string | null {
  const { borrador } = estado
  return borrador?.versionOrigenId && borrador.versionDeOrigen === null
    ? borrador.versionOrigenId
    : null
}

// El número leído de la versión de origen (nulo si ya no existe: `on delete set null` la soltaría, o no se ve).
export function conVersionDeOrigen(
  estado: EstadoDeLaFormula,
  version: number | null,
): EstadoDeLaFormula {
  return estado.borrador
    ? { ...estado, borrador: { ...estado.borrador, versionDeOrigen: version } }
    : estado
}

// El borrador está atrasado si empezó sobre una versión que ya no es la publicada: publicarlo dará PT409 (4.20-1). Uno sin versión de origen (el primero de un
// origen, o uno anterior al 4.20-1) no se sabe sobre cuál empezó: no se marca.
export function borradorAtrasado(
  borrador: Pick<BorradorDelOrigen, 'versionOrigenId'>,
  publicada: Pick<PublicadaDelOrigen, 'id'> | null,
): boolean {
  return borrador.versionOrigenId !== null && borrador.versionOrigenId !== (publicada?.id ?? null)
}

// La consulta pide una de más (`TAMANO_DE_VER_MAS + 1`): si llegó, hay otra página y no se muestra.
export function paginaDeVersiones(
  filas: readonly VersionDeLaFormula[],
  tamano: number = TAMANO_DE_VER_MAS,
): PaginaDeVersiones {
  const vistas = filas.slice(0, tamano)
  const ultima = vistas.at(-1)
  return { filas: vistas, siguiente: filas.length > tamano && ultima ? ultima.version : null }
}

// Los ids distintos de quienes nombra una página (y el estado), para leer sus nombres una vez.
export function autoresDe(ids: readonly (string | null)[]): string[] {
  return [...new Set(ids.filter((id): id is string => id !== null))]
}

// El nombre de quien publicó o guardó: sin autor (una fila escrita fuera de las RPC), «Alguien».
export function nombreDelAutor(autores: ReadonlyMap<string, string>, id: string | null): string {
  return (id === null ? undefined : autores.get(id)) ?? 'Alguien'
}

export function conAutores(
  pagina: PaginaDeVersiones,
  autores: ReadonlyMap<string, string>,
): PaginaConAutores {
  return {
    filas: pagina.filas.map((fila) => ({
      ...fila,
      autor: nombreDelAutor(autores, fila.publicadoPor),
    })),
    siguiente: pagina.siguiente,
  }
}

const esquemaDeIrA = z
  .string()
  .trim()
  .regex(/^\d+$/, { error: 'Escribe un número de versión.' })
  .transform(Number)
  .pipe(
    z
      .number()
      .int()
      .min(1, { error: 'Escribe un número de versión.' })
      .max(MAXIMA_VERSION, { error: 'Escribe un número de versión.' }),
  )

// «Ir a la versión N»: la lista vuelve a leer desde N hacia atrás, así que el cursor es N + 1 (`version < cursor`).
export function cursorDeIrA(texto: string): Resultado<number> {
  const leido = esquemaDeIrA.safeParse(texto)
  return leido.success
    ? ok(leido.data + 1)
    : fallo('validacion', leido.error.issues[0]?.message ?? 'Escribe un número de versión.')
}

// Los orígenes donde la persona configura la fórmula (`cotizaciones.configurar` de ese origen), en el orden del catálogo y también los inactivos: su fórmula se sigue
// pudiendo mirar. Lo que protege es la base (la policy `formulas: leer` pide la misma clave).
export function origenesParaConfigurar<O extends { id: string }>(
  permisos: Permisos,
  origenes: readonly O[],
): O[] {
  return origenes.filter((origen) => puede(permisos, 'cotizaciones.configurar', origen.id))
}
