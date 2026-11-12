import { z } from 'zod'

// Los grupos de transporte tal como los devuelven `transporte_grupos()` y `transporte_grupo()` (6.08-3): un grupo es el conjunto de unidades que comparten `booking` o `contenedor`. Puro: la
// infra pasa lo que leyó y acá se valida y se nombra. La base cuenta sólo las unidades que quien mira ve; ningún total exacto (el tope es de 200 por grupo).

export const TOPE_DE_UNIDADES_DEL_GRUPO = 200

export const CAMPOS_DE_VARIOS = [
  'naviera_id',
  'puerto_origen_id',
  'puerto_destino_id',
  'zarpe_el',
  'eta_el',
  'arribo_el',
] as const
export type CampoDeVarios = (typeof CAMPOS_DE_VARIOS)[number]

export type GrupoDeTransporte = {
  clave: string
  unidades: number
  hayMas: boolean
  hayOcultas: boolean
  navieraId: string | null
  puertoOrigenId: string | null
  puertoDestinoId: string | null
  zarpeEl: string | null
  etaEl: string | null
  arriboEl: string | null
  // Los campos que difieren entre las unidades vistas (su dato común sale nulo).
  varios: CampoDeVarios[]
}

export type PaginaDeGrupos = {
  grupos: GrupoDeTransporte[]
  // Opaco: el id de una fila; se pasa tal cual como `p_desde`.
  siguiente: string | null
  // La base paró a las 2.000 filas sin llenar la página: «Seguir buscando».
  cortada: boolean
}

export type UnidadDelGrupo = {
  transporteId: string
  vehiculoId: string | null
  repuestoId: string | null
  titulo: string
  faseId: string | null
  fase: string | null
  navieraId: string | null
  puertoOrigenId: string | null
  puertoDestinoId: string | null
  contenedor: string | null
  booking: string | null
  zarpeEl: string | null
  etaEl: string | null
  arriboEl: string | null
  // La versión que vio el resumen (la que «Editar grupo» devuelve a la base).
  actualizadoEn: string
  editable: boolean
}

export type GrupoLeido = {
  tipo: 'booking' | 'contenedor'
  clave: string
  unidades: UnidadDelGrupo[]
  hayMas: boolean
  hayOcultas: boolean
}

const esquemaDeVarios = z
  .array(z.string())
  .transform((nombres) =>
    nombres.filter((n): n is CampoDeVarios => (CAMPOS_DE_VARIOS as readonly string[]).includes(n)),
  )

const esquemaDeGrupo = z.object({
  clave: z.string(),
  unidades: z.number(),
  hay_mas: z.boolean(),
  hay_ocultas: z.boolean(),
  naviera_id: z.guid().nullable(),
  puerto_origen_id: z.guid().nullable(),
  puerto_destino_id: z.guid().nullable(),
  zarpe_el: z.string().nullable(),
  eta_el: z.string().nullable(),
  arribo_el: z.string().nullable(),
  varios: esquemaDeVarios,
})

const esquemaDePagina = z.object({
  grupos: z.array(esquemaDeGrupo),
  siguiente: z.string().nullable(),
  cortada: z.boolean(),
})

const esquemaDeUnidad = z.object({
  transporte_id: z.guid(),
  vehiculo_id: z.guid().nullable(),
  repuesto_id: z.guid().nullable(),
  titulo: z.string().nullable(),
  fase_id: z.guid().nullable(),
  fase: z.string().nullable(),
  naviera_id: z.guid().nullable(),
  puerto_origen_id: z.guid().nullable(),
  puerto_destino_id: z.guid().nullable(),
  contenedor: z.string().nullable(),
  booking: z.string().nullable(),
  zarpe_el: z.string().nullable(),
  eta_el: z.string().nullable(),
  arribo_el: z.string().nullable(),
  actualizado_en: z.string(),
  editable: z.boolean(),
})

const esquemaDeLeido = z.object({
  tipo: z.enum(['booking', 'contenedor']),
  clave: z.string(),
  unidades: z.array(esquemaDeUnidad),
  hay_mas: z.boolean(),
  hay_ocultas: z.boolean(),
})

/** Lo que devolvió `transporte_grupos()`; nulo si no tiene la forma esperada (la infra lo vuelve un error: nunca se descarta en silencio). */
export function paginaDeGruposDesde(datos: unknown): PaginaDeGrupos | null {
  const leido = esquemaDePagina.safeParse(datos)
  if (!leido.success) {
    return null
  }
  return {
    siguiente: leido.data.siguiente,
    cortada: leido.data.cortada,
    grupos: leido.data.grupos.map((g) => ({
      clave: g.clave,
      unidades: g.unidades,
      hayMas: g.hay_mas,
      hayOcultas: g.hay_ocultas,
      navieraId: g.naviera_id,
      puertoOrigenId: g.puerto_origen_id,
      puertoDestinoId: g.puerto_destino_id,
      zarpeEl: g.zarpe_el,
      etaEl: g.eta_el,
      arriboEl: g.arribo_el,
      varios: g.varios,
    })),
  }
}

/** Lo que devolvió `transporte_grupo()`; nulo si no tiene la forma esperada. Una unidad sin título (no debería) se escribe «Sin título». */
export function grupoDesde(datos: unknown): GrupoLeido | null {
  const leido = esquemaDeLeido.safeParse(datos)
  if (!leido.success) {
    return null
  }
  const g = leido.data
  return {
    tipo: g.tipo,
    clave: g.clave,
    hayMas: g.hay_mas,
    hayOcultas: g.hay_ocultas,
    unidades: g.unidades.map((u) => ({
      transporteId: u.transporte_id,
      vehiculoId: u.vehiculo_id,
      repuestoId: u.repuesto_id,
      titulo: u.titulo ?? 'Sin título',
      faseId: u.fase_id,
      fase: u.fase,
      navieraId: u.naviera_id,
      puertoOrigenId: u.puerto_origen_id,
      puertoDestinoId: u.puerto_destino_id,
      contenedor: u.contenedor,
      booking: u.booking,
      zarpeEl: u.zarpe_el,
      etaEl: u.eta_el,
      arriboEl: u.arribo_el,
      actualizadoEn: u.actualizado_en,
      editable: u.editable,
    })),
  }
}

export type ValorDelGrupo<T> = { tipo: 'comun'; valor: T } | { tipo: 'varios' } | { tipo: 'sin' }

/**
 * Lo que dice una columna de un grupo: su dato común, «varios» si las unidades vistas difieren (aunque el valor salga nulo) o «sin» si ninguna lo tiene. Se distingue «Varias» de «—»
 * (D30): un dato que difiere no es un dato que falta.
 */
export function valorDelGrupo<T extends string>(
  valor: T | null,
  campo: CampoDeVarios,
  varios: readonly CampoDeVarios[],
): ValorDelGrupo<T> {
  if (varios.includes(campo)) {
    return { tipo: 'varios' }
  }
  return valor === null ? { tipo: 'sin' } : { tipo: 'comun', valor }
}

/** «1 unidad», «N unidades», «200+ unidades» con más de las que se cuentan: nunca un total exacto. */
export function textoDeUnidades(n: number, hayMas: boolean): string {
  if (hayMas) {
    return `${String(TOPE_DE_UNIDADES_DEL_GRUPO)}+ unidades`
  }
  return n === 1 ? '1 unidad' : `${String(n)} unidades`
}

/** El nombre de un id de catálogo; nulo si ya no está en la lista leída (nunca se escribe el uuid). */
export function nombreDeCatalogo(
  lista: readonly { id: string; nombre: string }[],
  id: string | null,
): string | null {
  if (id === null) {
    return null
  }
  return lista.find((e) => e.id === id)?.nombre ?? null
}
