// Un mensaje tal como lo dibuja el hilo de `/chat` (7.09-3): la fila de `mensajes` validada, lo que se escribe y todavía no llegó, y las reglas
// puras del hilo (fusión por `id`, cabeza con hueco, texto válido, borde de «Ir a una fecha»). Sin I/O.
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { diaSiguiente, inicioDelDia } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import type { Cursor } from '@/shared/lib/paginacion'
import type { FalloDeEscritura } from './escritura'

export const LARGO_MAXIMO = 4000

// `enviando` y `fallido` son del navegador: todavía no hay fila en la base.
export type EstadoDeEnvio = 'enviado' | 'enviando' | 'fallido'

export type Mensaje = {
  id: string
  conversacionId: string
  autorId: string
  autorNombre: string | null
  tipo: string
  cuerpo: string | null
  // Fechas ISO, tal como las devolvió la base.
  creadoEn: string
  editadoEn: string | null
  eliminadoEn: string | null
  respondeAId: string | null
  estado: EstadoDeEnvio
  // Por qué no se envió, dicho por la base o por la red.
  motivoDelFallo?: string
}

export type PaginaDeMensajes = {
  // De más viejo a más nuevo.
  mensajes: Mensaje[]
  hayMas: boolean
}

const esquemaDeFila = z.object({
  id: z.guid(),
  conversacion_id: z.guid(),
  autor_id: z.guid(),
  tipo: z.string(),
  cuerpo: z.string().nullable(),
  creado_en: z.string(),
  editado_en: z.string().nullable(),
  eliminado_en: z.string().nullable(),
  responde_a_id: z.guid().nullable(),
  autor: z.object({ nombre: z.string().nullable() }).nullish(),
})

const esquemaDeFilas = z.array(esquemaDeFila)

// Las filas de PostgREST llegan de la más nueva a la más vieja y con una de más (la señal de `hayMas`): se cortan en `tamano` y se dan vuelta.
// Una fila mal formada es un valor, no una excepción.
export function leerMensajes(filas: unknown, tamano: number): Resultado<PaginaDeMensajes> {
  const lectura = esquemaDeFilas.safeParse(filas)
  if (!lectura.success) {
    return fallo('inesperado', 'No pudimos leer los mensajes. Vuelve a intentar en un momento.')
  }
  const { filas: dentro, hayMas } = cortarAlTope(lectura.data, tamano)
  return ok({
    hayMas,
    mensajes: dentro
      .map((f): Mensaje => ({
        id: f.id,
        conversacionId: f.conversacion_id,
        autorId: f.autor_id,
        autorNombre: f.autor?.nombre ?? null,
        tipo: f.tipo,
        cuerpo: f.cuerpo,
        creadoEn: f.creado_en,
        editadoEn: f.editado_en,
        eliminadoEn: f.eliminado_en,
        respondeAId: f.responde_a_id,
        estado: 'enviado',
      }))
      .reverse(),
  })
}

// Los instantes se comparan como instantes (la base recorta los ceros de la fracción); un empate cae al texto y al id.
function masViejoPrimero(a: Mensaje, b: Mensaje): number {
  const delta = Date.parse(a.creadoEn) - Date.parse(b.creadoEn)
  if (delta !== 0) {
    return delta
  }
  if (a.creadoEn !== b.creadoEn) {
    return a.creadoEn < b.creadoEn ? -1 : 1
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

const esEnviado = (m: Mensaje) => m.estado === 'enviado'

// Funde lo recién leído con lo cargado, por `id`: manda la fila del servidor. Lo enviado va por `(creadoEn, id)`; lo que se está enviando o falló va
// siempre al final, en el orden en que se escribió (el reloj del navegador y el del servidor pueden discrepar).
export function fundirMensajes(
  cargados: readonly Mensaje[],
  nuevos: readonly Mensaje[],
): Mensaje[] {
  const delServidor = new Map(nuevos.map((m) => [m.id, m]))
  const enviados = new Map<string, Mensaje>()
  for (const m of cargados) {
    if (esEnviado(m) && !delServidor.has(m.id)) {
      enviados.set(m.id, m)
    }
  }
  const pendientes = cargados.filter((m) => !esEnviado(m) && !delServidor.has(m.id))
  for (const m of nuevos) {
    enviados.set(m.id, { ...m, estado: 'enviado' })
  }
  return [...[...enviados.values()].sort(masViejoPrimero), ...pendientes]
}

// La cabeza fresca (los más nuevos) contra lo cargado. Si trae «más atrás» y ninguno de sus `id` estaba cargado, hubo un hueco (una ráfaga mayor
// que la cabeza o un corte largo): lo cargado enviado se reemplaza por lo fresco, los pendientes se conservan y «Ver anteriores» vuelve a ofrecerse.
// Si no, se funde y `hayAnteriores` queda como estaba.
export function fundirCabeza(
  cargados: readonly Mensaje[],
  frescos: readonly Mensaje[],
  hayMasAtras: boolean,
  hayAnteriores: boolean,
): { mensajes: Mensaje[]; hayAnteriores: boolean } {
  const idsEnviados = new Set(cargados.filter(esEnviado).map((m) => m.id))
  const hayHueco =
    hayMasAtras && idsEnviados.size > 0 && frescos.every((m) => !idsEnviados.has(m.id))
  if (hayHueco) {
    return {
      mensajes: fundirMensajes(
        cargados.filter((m) => !esEnviado(m)),
        frescos,
      ),
      hayAnteriores: true,
    }
  }
  return { mensajes: fundirMensajes(cargados, frescos), hayAnteriores }
}

// «Ver anteriores» sigue desde el primero de lo enviado.
export function cursorDeMensaje(m: Pick<Mensaje, 'creadoEn' | 'id'>): Cursor {
  return { instante: m.creadoEn, id: m.id, sentido: 'siguiente' }
}

// El borde **exclusivo** de «ese día y lo anterior»: el inicio del día siguiente en la zona de la empresa.
export function bordeDelDia(dia: string, zona: string): string {
  return inicioDelDia(diaSiguiente(dia), { zona })
}

export type TextoValido =
  { ok: true; cuerpo: string } | { ok: false; motivo: 'vacio' | 'largo'; mensaje?: string }

// Lo que se envía: el texto sin los extremos. Vacío no se envía y no dice nada; más del largo máximo dice por qué.
export function textoValido(texto: string): TextoValido {
  const cuerpo = texto.trim()
  if (cuerpo === '') {
    return { ok: false, motivo: 'vacio' }
  }
  if (cuerpo.length > LARGO_MAXIMO) {
    return {
      ok: false,
      motivo: 'largo',
      mensaje: `El mensaje supera los ${formatearNumero(LARGO_MAXIMO)} caracteres.`,
    }
  }
  return { ok: true, cuerpo }
}

// El mensaje que se ve apenas se escribe, con el `id` que lo hará idempotente en la base.
export function mensajeLocal(datos: {
  id: string
  conversacion: string
  cuerpo: string
  yo: string
  nombre: string | null
  ahora: string
}): Mensaje {
  return {
    id: datos.id,
    conversacionId: datos.conversacion,
    autorId: datos.yo,
    autorNombre: datos.nombre,
    tipo: 'texto',
    cuerpo: datos.cuerpo,
    creadoEn: datos.ahora,
    editadoEn: null,
    eliminadoEn: null,
    respondeAId: null,
    estado: 'enviando',
  }
}

// El más nuevo mensaje enviado de otra persona y no eliminado: hasta ahí se marca leído.
export function ultimoDeOtro(mensajes: readonly Mensaje[], yo: string): Mensaje | null {
  let ultimo: Mensaje | null = null
  for (const m of mensajes) {
    if (m.autorId === yo || !esEnviado(m) || m.eliminadoEn !== null) {
      continue
    }
    if (ultimo === null || masViejoPrimero(ultimo, m) < 0) {
      ultimo = m
    }
  }
  return ultimo
}

const esquemaDeEnvio = z.object({
  resultado: z.enum(['enviado', 'repetido']),
  id: z.guid(),
  creado_en: z.string().min(1),
})

// De lo que devolvió `mensaje_enviar` al id y el instante del servidor, o un error si no tiene la forma esperada.
export function leerResultadoDeEnvio(
  datos: unknown,
): { ok: true; data: { id: string; creadoEn: string } } | FalloDeEscritura {
  const leido = esquemaDeEnvio.safeParse(datos)
  if (!leido.success) {
    return fallo('inesperado', 'No pudimos confirmar que se envió. Revisa la conversación.')
  }
  return { ok: true, data: { id: leido.data.id, creadoEn: leido.data.creado_en } }
}
