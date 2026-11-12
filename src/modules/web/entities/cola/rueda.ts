// Escribir la rueda de la cola web (8.04-3): agregar a alguien del equipo, cambiar su cupo, prioridad u orden, y quitarlo. Puro: los textos, los
// límites de la interfaz y quién del equipo se puede elegir. La escritura va por `cola_web_configurar` (la base exige `web.cola.gestionar`).
import type { FilaDelTablero } from './tablero'

export const TEXTO_HABILITADA_SIN_PERMISO =
  'Quedó habilitada, pero su rol no recibe turnos de la web.'
export const MOTIVO_SIN_PERMISO_COLA = 'Tu rol no gestiona la cola web.'
export const MOTIVO_SIN_EQUIPO = 'Tu rol no ve el equipo.'
export const MOTIVO_CUENTA_BLOQUEADA = 'Cuenta bloqueada'

// Espejo de `MINIMO_DE_BUSQUEDA_DEL_EQUIPO` (`equipo/entities/lista-equipo.ts`), que no sale por ninguna entrada de `equipo`: con menos letras,
// `equipo_lista()` no filtra y trae las primeras por nombre. Si cambia allá, aquí sólo cambia el aviso: la que decide es la base.
export const MINIMO_PARA_BUSCAR = 3
export const AVISO_MINIMO_PARA_BUSCAR = 'Escribe al menos 3 letras para buscar.'

// Lo que acepta la interfaz. El cupo es el `check` de `cola_web_asesores` (1–50 o nulo, que hereda la política); prioridad y orden son `smallint` sin
// `check` en la base: aquí van angostos (se ensanchan sin migrar).
export const LIMITES_DE_LA_RUEDA = {
  cupo: { min: 1, max: 50 },
  prioridad: { min: 0, max: 10 },
  orden: { min: 0, max: 999 },
} as const

// Cómo está (o va a estar) alguien en la rueda. `maxAbiertas` nulo hereda el cupo de la política.
export type ConfiguracionEnLaRueda = {
  usuarioId: string
  maxAbiertas: number | null
  prioridad: number
  orden: number
}

// Quien recién entra: cupo de la política, prioridad 0 y orden 0 (los defectos de `cola_web_configurar`).
export function configuracionNueva(usuarioId: string): ConfiguracionEnLaRueda {
  return { usuarioId, maxAbiertas: null, prioridad: 0, orden: 0 }
}

export function configuracionDe(fila: FilaDelTablero): ConfiguracionEnLaRueda {
  return {
    usuarioId: fila.usuarioId,
    maxAbiertas: fila.maxAbiertas,
    prioridad: fila.prioridad,
    orden: fila.orden,
  }
}

// Una persona del equipo vista desde «Agregar a la rueda».
export type PersonaParaLaRueda = {
  id: string
  nombre: string
  email: string
  elegible: boolean
  // Por qué no se puede elegir, si no se puede.
  motivo: string | null
  // Ya habilitada: sus valores (se precargan; nunca se pisan con los de fábrica).
  enLaRueda: ConfiguracionEnLaRueda | null
}

// Lo que se necesita de una persona del equipo (tipado estructural: `web` no importa `equipo`).
type PersonaDelEquipo = { id: string; nombre: string; email: string; estado: string }

// De la página del equipo y las filas del tablero, quién se puede elegir. Dada de baja no figura. Bloqueada sale apagada: no entraría en la rueda y el
// aviso «su rol no recibe turnos» mentiría. Activa o con la invitación pendiente se elige (la rueda mira sólo `activo` y `bloqueado`): así, si al
// guardar no quedó en la rueda, la causa es su rol.
export function personasParaLaRueda(
  personas: readonly PersonaDelEquipo[],
  filas: readonly FilaDelTablero[],
): PersonaParaLaRueda[] {
  const habilitadas = new Map(filas.map((fila) => [fila.usuarioId, configuracionDe(fila)]))
  return personas
    .filter((persona) => persona.estado !== 'baja')
    .map((persona) => {
      const bloqueada = persona.estado === 'bloqueada'
      return {
        id: persona.id,
        nombre: persona.nombre,
        email: persona.email,
        elegible: !bloqueada,
        motivo: bloqueada ? MOTIVO_CUENTA_BLOQUEADA : null,
        enLaRueda: habilitadas.get(persona.id) ?? null,
      }
    })
}
