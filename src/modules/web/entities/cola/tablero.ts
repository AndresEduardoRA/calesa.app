// El tablero de la cola web (8.04-2): lo que devuelve `cola_web_tablero` (todas las habilitadas de `cola_web_asesores`) y en qué grupo cae cada una.
// Puro: la respuesta de la RPC es un `jsonb` sin tipo, así que se **parsea** (Zod en todo límite).
import { z } from 'zod'

export type FilaDelTablero = {
  usuarioId: string
  nombre: string
  // `puede_estar_en_la_rueda()`: algún rol suyo tiene `web.cola.participar` (y la cuenta está activa).
  enLaRueda: boolean
  // Activa y sin bloquear. Va aparte para no decir «su rol no recibe turnos» de quien está bloqueada (8.04-1, D7).
  cuentaActiva: boolean
  faltaWhatsapp: boolean
  disponible: boolean
  prioridad: number
  orden: number
  // El cupo propio; nulo hereda el de la política.
  maxAbiertas: number | null
  // El cupo que rige: el propio o el de la política (`coalesce` en la base).
  cupo: number
  abiertas: number
  asignadasTotal: number
  contactadasTotal: number
  vencidasTotal: number
  // De 0 a 100, con un decimal; nula si todavía no recibió turnos.
  tasaContactoPct: number | null
  ultimaAsignacionEn: string | null
}

export type Tablero = { filas: FilaDelTablero[]; hayMas: boolean }

export const TEXTO_EN_LA_RUEDA = 'En la rueda'
export const TEXTO_HABILITADA_SIN_ROL = 'Habilitada, pero su rol no recibe turnos de la web'
export const TEXTO_CUENTA_INACTIVA = 'Cuenta bloqueada o inactiva'

const entero = z.number().int()

const esquema = z.object({
  filas: z.array(
    z.object({
      usuario_id: z.guid(),
      nombre: z.string(),
      en_la_rueda: z.boolean(),
      cuenta_activa: z.boolean(),
      falta_whatsapp: z.boolean(),
      disponible: z.boolean(),
      prioridad: entero,
      orden: entero,
      max_abiertas: entero.nullable(),
      cupo: entero,
      abiertas: entero,
      asignadas_total: entero,
      contactadas_total: entero,
      vencidas_total: entero,
      tasa_contacto_pct: z.number().nullable(),
      ultima_asignacion_en: z.iso.datetime({ offset: true }).nullable(),
    }),
  ),
  hay_mas: z.boolean(),
})

// De lo que devolvió la RPC al tablero, o `null` si no tiene la forma esperada.
export function tableroDesde(datos: unknown): Tablero | null {
  const leido = esquema.safeParse(datos)
  if (!leido.success) {
    return null
  }
  return {
    filas: leido.data.filas.map((f) => ({
      usuarioId: f.usuario_id,
      nombre: f.nombre,
      enLaRueda: f.en_la_rueda,
      cuentaActiva: f.cuenta_activa,
      faltaWhatsapp: f.falta_whatsapp,
      disponible: f.disponible,
      prioridad: f.prioridad,
      orden: f.orden,
      maxAbiertas: f.max_abiertas,
      cupo: f.cupo,
      abiertas: f.abiertas,
      asignadasTotal: f.asignadas_total,
      contactadasTotal: f.contactadas_total,
      vencidasTotal: f.vencidas_total,
      tasaContactoPct: f.tasa_contacto_pct,
      ultimaAsignacionEn: f.ultima_asignacion_en,
    })),
    hayMas: leido.data.hay_mas,
  }
}

export type TableroAgrupado = {
  // Las que la ruleta puede elegir (su orden lo da `ordenDeLaRueda`).
  rueda: FilaDelTablero[]
  // Activas y habilitadas, pero ningún rol suyo tiene `web.cola.participar`.
  porRol: FilaDelTablero[]
  // Bloqueadas o dadas de baja: la causa es la cuenta, no el rol.
  porCuenta: FilaDelTablero[]
}

// Cada fila cae en un solo grupo: la cuenta manda sobre el rol (una bloqueada nunca está «en la rueda» ni «sin rol»).
export function agruparTablero(filas: readonly FilaDelTablero[]): TableroAgrupado {
  const grupos: TableroAgrupado = { rueda: [], porRol: [], porCuenta: [] }
  for (const fila of filas) {
    if (!fila.cuentaActiva) {
      grupos.porCuenta.push(fila)
    } else if (fila.enLaRueda) {
      grupos.rueda.push(fila)
    } else {
      grupos.porRol.push(fila)
    }
  }
  return grupos
}
