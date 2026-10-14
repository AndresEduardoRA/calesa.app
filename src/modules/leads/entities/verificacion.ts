// Lo que la base dice de un teléfono (`verificar_telefono()` y el resultado «no se creó» de
// `crear_lead()`): libre, de alguien (y de quién) o sin dueño. Nunca trae más del lead que lo
// mínimo para decirlo.
import { z } from 'zod'

export type Verificacion =
  | { estado: 'libre' }
  // Sin dueño: invisible hasta que alguien lo toma al registrar el teléfono.
  | { estado: 'limbo' }
  // Es un lead que esta persona puede ver.
  | { estado: 'existe'; leadId: string; numero: number; nombre: string; esMio: boolean }
  // Lo tiene otra persona: sólo se sabe de quién, nada más del lead.
  | { estado: 'de_otro'; dueno: string | null }

const esquema = z.discriminatedUnion('estado', [
  z.object({ estado: z.literal('libre') }),
  z.object({ estado: z.literal('limbo') }),
  z.object({
    estado: z.literal('existe'),
    lead_id: z.guid(),
    numero: z.number(),
    nombre: z.string(),
    es_mio: z.boolean(),
  }),
  z.object({ estado: z.literal('de_otro'), dueno: z.string().nullable().optional() }),
])

// El `jsonb` de la base como `Verificacion`. Algo que no calza es un error de programación (la
// respuesta cambió): sube como excepción y lo recoge el límite de la action.
export function verificacionDesde(crudo: unknown): Verificacion {
  const lectura = esquema.parse(crudo)
  switch (lectura.estado) {
    case 'libre':
    case 'limbo':
      return { estado: lectura.estado }
    case 'existe':
      return {
        estado: 'existe',
        leadId: lectura.lead_id,
        numero: lectura.numero,
        nombre: lectura.nombre,
        esMio: lectura.es_mio,
      }
    case 'de_otro':
      return { estado: 'de_otro', dueno: lectura.dueno ?? null }
  }
}

// Lo que se le dice a quien tipea, y si deja seguir. «Lo tiene …» sin acción: escribirle por chat
// llega con el chat (Fase 7).
export type AvisoDeTelefono = {
  tono: 'neutro' | 'aviso' | 'peligro'
  texto: string
  // Con este teléfono no se puede crear otro lead.
  bloquea: boolean
  // Se ofrece «Tomar lead».
  ofreceTomar: boolean
}

export function avisoDeVerificacion(verificacion: Verificacion): AvisoDeTelefono {
  switch (verificacion.estado) {
    case 'libre':
      return { tono: 'neutro', texto: '', bloquea: false, ofreceTomar: false }
    case 'limbo':
      return {
        tono: 'aviso',
        texto: 'Sin dueño.',
        bloquea: false,
        ofreceTomar: true,
      }
    case 'existe':
      return {
        tono: 'peligro',
        texto: verificacion.esMio
          ? `Ya existe: ${verificacion.nombre} (#${String(verificacion.numero)}), y es tuyo.`
          : `Ya existe: ${verificacion.nombre} (#${String(verificacion.numero)}).`,
        bloquea: true,
        ofreceTomar: false,
      }
    case 'de_otro':
      return {
        tono: 'peligro',
        texto: `Lo tiene ${verificacion.dueno ?? 'otra persona'}.`,
        bloquea: true,
        ofreceTomar: false,
      }
  }
}
