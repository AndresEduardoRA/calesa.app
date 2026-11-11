// La forma de lo que devuelve `agenda_rango` (7.06-2) y las cuatro clases de la agenda. La respuesta de la RPC es un `jsonb` sin tipo: aquí se
// **parsea** (Zod en todo límite) y se pasa a camelCase. Las fechas viajan como ISO, nunca como `Date`. `estado` y `estado_subasta` quedan como
// texto: son enums de la base que cambian y la pantalla no ramifica por ellos (salvo «hecha», abajo).
import { z } from 'zod'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Enums } from '@/shared/types/database.types'

export const CLAVES_DE_CLASE = ['evento', 'tarea', 'recordatorio', 'subasta'] as const
export type ClaveDeClase = (typeof CLAVES_DE_CLASE)[number]

export type ClaseDeAgenda = {
  clave: ClaveDeClase
  // «Evento»: lo que dice el chip además del color (nunca sólo color).
  nombre: string
  // «eventos»: para el aviso de tope.
  plural: string
}

export const CLASES_DE_AGENDA: readonly ClaseDeAgenda[] = [
  { clave: 'evento', nombre: 'Evento', plural: 'eventos' },
  { clave: 'tarea', nombre: 'Tarea', plural: 'tareas' },
  { clave: 'recordatorio', nombre: 'Recordatorio', plural: 'recordatorios' },
  { clave: 'subasta', nombre: 'Subasta', plural: 'subastas' },
]

export function claseDe(clave: ClaveDeClase): ClaseDeAgenda {
  return CLASES_DE_AGENDA.find((clase) => clase.clave === clave) ?? CLASES_DE_AGENDA[0]!
}

// La tarea completada («hecha») se tacha en el chip. El valor es el de la base (`tareas.estado`).
export const ESTADO_DE_TAREA_HECHA: Enums<'estado_agenda'> = 'completado'

export type EventoDeAgenda = {
  id: string
  titulo: string
  iniciaEn: string
  terminaEn: string | null
  visibilidad: string
  estado: string
  mio: boolean
}

export type TareaDeAgenda = {
  id: string
  titulo: string
  venceEn: string
  estado: string
  responsableId: string
  mia: boolean
}

export type RecordatorioDeAgenda = {
  id: string
  titulo: string
  recordarEn: string
}

export type SubastaDeAgenda = {
  id: string
  vehiculoId: string
  titulo: string
  cierreSubastaEn: string
  estadoSubasta: string
  origenId: string
}

export type AgendaDeRango = {
  eventos: EventoDeAgenda[]
  tareas: TareaDeAgenda[]
  recordatorios: RecordatorioDeAgenda[]
  subastas: SubastaDeAgenda[]
  // Una clase llegó a su tope: hay más de lo que se trae (`tope` por clase).
  hayMas: Record<ClaveDeClase, boolean>
  tope: number
}

const iso = z.iso.datetime({ offset: true })

const esquemaDeEvento = z.object({
  id: z.guid(),
  titulo: z.string(),
  inicia_en: iso,
  termina_en: iso.nullable(),
  visibilidad: z.string(),
  estado: z.string(),
  mio: z.boolean(),
})

const esquemaDeTarea = z.object({
  id: z.guid(),
  titulo: z.string(),
  vence_en: iso,
  estado: z.string(),
  responsable_id: z.guid(),
  mia: z.boolean(),
})

const esquemaDeRecordatorio = z.object({
  id: z.guid(),
  titulo: z.string(),
  recordar_en: iso,
})

const esquemaDeSubasta = z.object({
  vehiculo_id: z.guid(),
  titulo: z.string(),
  cierre_subasta_en: iso,
  estado_subasta: z.string(),
  origen_id: z.guid(),
})

export const esquemaDeAgendaDeRango = z
  .object({
    eventos: z.array(esquemaDeEvento),
    tareas: z.array(esquemaDeTarea),
    recordatorios: z.array(esquemaDeRecordatorio),
    subastas: z.array(esquemaDeSubasta),
    hay_mas: z.object({
      eventos: z.boolean(),
      tareas: z.boolean(),
      recordatorios: z.boolean(),
      subastas: z.boolean(),
    }),
    tope: z.number().int().positive(),
  })
  .transform((crudo): AgendaDeRango => ({
    eventos: crudo.eventos.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      iniciaEn: e.inicia_en,
      terminaEn: e.termina_en,
      visibilidad: e.visibilidad,
      estado: e.estado,
      mio: e.mio,
    })),
    tareas: crudo.tareas.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      venceEn: t.vence_en,
      estado: t.estado,
      responsableId: t.responsable_id,
      mia: t.mia,
    })),
    recordatorios: crudo.recordatorios.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      recordarEn: r.recordar_en,
    })),
    subastas: crudo.subastas.map((s) => ({
      id: s.vehiculo_id,
      vehiculoId: s.vehiculo_id,
      titulo: s.titulo,
      cierreSubastaEn: s.cierre_subasta_en,
      estadoSubasta: s.estado_subasta,
      origenId: s.origen_id,
    })),
    hayMas: {
      evento: crudo.hay_mas.eventos,
      tarea: crudo.hay_mas.tareas,
      recordatorio: crudo.hay_mas.recordatorios,
      subasta: crudo.hay_mas.subastas,
    },
    tope: crudo.tope,
  }))

// Parsea la respuesta de `agenda_rango`; lo que no encaja vuelve como valor, no como excepción.
export function leerAgendaDeRango(crudo: unknown): Resultado<AgendaDeRango> {
  const resultado = esquemaDeAgendaDeRango.safeParse(crudo)
  return resultado.success
    ? ok(resultado.data)
    : fallo('inesperado', 'La agenda llegó con un formato que no se reconoce.')
}

// Lo que pide una lectura de la agenda: el rango semiabierto `[desde, hasta)` en ISO y si es la de todos (`agenda.ver_todo`).
export type LectorDeAgenda = (rango: {
  desde: string
  hasta: string
  deTodos: boolean
}) => Promise<Resultado<AgendaDeRango>>

// Cómo se llama cada visibilidad de un evento en pantalla (Glosario: «Evento»: privada, pública o «seleccionados»).
export const ETIQUETA_DE_VISIBILIDAD: Record<string, string> = {
  privado: 'Privado',
  publico: 'Público',
  seleccionados: 'Seleccionados',
}

// Lo que dibuja un chip: las cuatro clases aplanadas a una misma forma. `instante` es el que ubica la cosa en el día (inicio, vencimiento, hora
// o cierre). `ruta` es a dónde lleva: la subasta, a `/vehiculos/<id>`; el evento y la tarea, a su panel (`rutaDe`, 7.07-2); el recordatorio sigue sin ruta (7.07-3).
export type EntradaDeAgenda = {
  clave: ClaveDeClase
  id: string
  titulo: string
  instante: string
  hecha: boolean
  detalle: string | null
  ruta: string | null
}

// De la respuesta de `agenda_rango` a las entradas que se agrupan por día, sólo de las clases pedidas (`?ver=`).
// `rutaDe` pone la ruta de cada entrada por su clase y su id (nulo = sin enlace); sin ella, sólo la subasta lleva ruta.
export type RutaDeEntrada = (clave: ClaveDeClase, id: string) => string | null

export function entradasDeAgenda(
  agenda: AgendaDeRango,
  clases: readonly ClaveDeClase[],
  rutaDe: RutaDeEntrada = () => null,
): EntradaDeAgenda[] {
  const pide = (clave: ClaveDeClase) => clases.includes(clave)
  return [
    ...(pide('evento')
      ? agenda.eventos.map((e): EntradaDeAgenda => ({
          clave: 'evento',
          id: e.id,
          titulo: e.titulo,
          instante: e.iniciaEn,
          hecha: false,
          detalle:
            e.visibilidad === 'privado' ? null : (ETIQUETA_DE_VISIBILIDAD[e.visibilidad] ?? null),
          ruta: rutaDe('evento', e.id),
        }))
      : []),
    ...(pide('tarea')
      ? agenda.tareas.map((t): EntradaDeAgenda => ({
          clave: 'tarea',
          id: t.id,
          titulo: t.titulo,
          instante: t.venceEn,
          hecha: t.estado === ESTADO_DE_TAREA_HECHA,
          detalle: null,
          ruta: rutaDe('tarea', t.id),
        }))
      : []),
    ...(pide('recordatorio')
      ? agenda.recordatorios.map((r): EntradaDeAgenda => ({
          clave: 'recordatorio',
          id: r.id,
          titulo: r.titulo,
          instante: r.recordarEn,
          hecha: false,
          detalle: null,
          ruta: rutaDe('recordatorio', r.id),
        }))
      : []),
    ...(pide('subasta')
      ? agenda.subastas.map((s): EntradaDeAgenda => ({
          clave: 'subasta',
          id: s.id,
          titulo: s.titulo,
          instante: s.cierreSubastaEn,
          hecha: false,
          detalle: null,
          ruta: `/vehiculos/${s.vehiculoId}`,
        }))
      : []),
  ]
}
