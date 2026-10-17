// Lo que la base dice de un teléfono (`verificar_telefono()`, `verificar_telefono_de_lead()` y el
// resultado «no se hizo» de `crear_lead()` y `cambiar_telefono_lead()`): libre, de alguien (y de
// quién) o sin dueño. Nunca trae más del lead que lo mínimo para decirlo.
import { z } from 'zod'
import {
  CAMPOS_DE_NUMEROS,
  numeroEnFrase,
  numerosDesde,
  type NumerosDeLead,
} from '@/shared/lib/numeros-de-lead'

// Un número libre como principal que figura como teléfono extra de otro lead: se avisa, no
// bloquea (un extra no tiene unicidad). Dice de él lo mismo que el principal: nombre y número si
// se ve, y si no, sólo quién lo tiene.
export type Alterno =
  | { estado: 'existe'; leadId: string; numeros: NumerosDeLead; nombre: string; esMio: boolean }
  | { estado: 'de_otro'; dueno: string | null }

export type Verificacion =
  // `alterno`: figura como teléfono extra de otro lead. `esExtra`: ya es un extra de este lead (sólo
  // al cambiar el principal: al cambiarlo sale de los extras).
  | { estado: 'libre'; alterno?: Alterno; esExtra?: boolean }
  // Sin dueño: invisible hasta que alguien lo toma al registrar el teléfono.
  | { estado: 'limbo' }
  // Es un lead que esta persona puede ver.
  | { estado: 'existe'; leadId: string; numeros: NumerosDeLead; nombre: string; esMio: boolean }
  // Lo tiene otra persona: sólo se sabe de quién, nada más del lead.
  | { estado: 'de_otro'; dueno: string | null }
  // Es el principal de este mismo lead (sólo al cambiarlo): no hay nada que cambiar.
  | { estado: 'mismo' }

const esquemaAlterno = z.discriminatedUnion('estado', [
  z.object({
    estado: z.literal('existe'),
    lead_id: z.guid(),
    ...CAMPOS_DE_NUMEROS,
    nombre: z.string(),
    es_mio: z.boolean(),
  }),
  z.object({ estado: z.literal('de_otro'), dueno: z.string().nullable().optional() }),
])

const esquema = z.discriminatedUnion('estado', [
  z.object({
    estado: z.literal('libre'),
    alterno: esquemaAlterno.optional(),
    es_extra: z.boolean().optional(),
  }),
  z.object({ estado: z.literal('limbo') }),
  z.object({
    estado: z.literal('existe'),
    lead_id: z.guid(),
    ...CAMPOS_DE_NUMEROS,
    nombre: z.string(),
    es_mio: z.boolean(),
  }),
  z.object({ estado: z.literal('de_otro'), dueno: z.string().nullable().optional() }),
  z.object({ estado: z.literal('mismo') }),
])

function alternoDesde(lectura: z.infer<typeof esquemaAlterno>): Alterno {
  if (lectura.estado === 'existe') {
    return {
      estado: 'existe',
      leadId: lectura.lead_id,
      numeros: numerosDesde(lectura),
      nombre: lectura.nombre,
      esMio: lectura.es_mio,
    }
  }
  return { estado: 'de_otro', dueno: lectura.dueno ?? null }
}

// El `jsonb` de la base como `Verificacion`. Algo que no calza es un error de programación (la
// respuesta cambió): sube como excepción y lo recoge el límite de la action.
export function verificacionDesde(crudo: unknown): Verificacion {
  const lectura = esquema.parse(crudo)
  switch (lectura.estado) {
    case 'libre':
      return {
        estado: 'libre',
        ...(lectura.alterno ? { alterno: alternoDesde(lectura.alterno) } : {}),
        ...(lectura.es_extra ? { esExtra: true } : {}),
      }
    case 'limbo':
    case 'mismo':
      return { estado: lectura.estado }
    case 'existe':
      return {
        estado: 'existe',
        leadId: lectura.lead_id,
        numeros: numerosDesde(lectura),
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
  // Con este teléfono no se puede crear otro lead (ni cambiar el principal de este).
  bloquea: boolean
  // Se ofrece «Tomar lead».
  ofreceTomar: boolean
}

// En el alta un número sin dueño se puede tomar; al cambiar el principal de un lead, no: sólo se dice.
export type ContextoDeVerificacion = 'alta' | 'cambio'

// « (N.º 1.234)» si se ve alguno de los números del lead; nada si no.
function conNumero(numeros: NumerosDeLead): string {
  const escrito = numeroEnFrase(numeros)
  return escrito === null ? '' : ` (${escrito})`
}

function textoDeAlterno(alterno: Alterno): string {
  if (alterno.estado === 'existe') {
    return `Figura como teléfono extra de ${alterno.nombre}${conNumero(alterno.numeros)}.`
  }
  return `Figura como teléfono extra de un lead de ${alterno.dueno ?? 'otra persona'}.`
}

export function avisoDeVerificacion(
  verificacion: Verificacion,
  contexto: ContextoDeVerificacion = 'alta',
): AvisoDeTelefono {
  switch (verificacion.estado) {
    case 'libre':
      if (verificacion.alterno) {
        return {
          tono: 'aviso',
          texto: textoDeAlterno(verificacion.alterno),
          bloquea: false,
          ofreceTomar: false,
        }
      }
      if (verificacion.esExtra) {
        return {
          tono: 'neutro',
          texto: 'Ya es un teléfono extra de este lead: pasará a ser el principal.',
          bloquea: false,
          ofreceTomar: false,
        }
      }
      return { tono: 'neutro', texto: '', bloquea: false, ofreceTomar: false }
    case 'limbo':
      if (contexto === 'cambio') {
        return {
          tono: 'peligro',
          texto: 'Ya existe, sin dueño. No se puede usar este número.',
          bloquea: true,
          ofreceTomar: false,
        }
      }
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
          ? `Ya existe: ${verificacion.nombre}${conNumero(verificacion.numeros)}, y es tuyo.`
          : `Ya existe: ${verificacion.nombre}${conNumero(verificacion.numeros)}.`,
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
    case 'mismo':
      return {
        tono: 'aviso',
        texto: 'Ese es el teléfono principal de este lead.',
        bloquea: true,
        ofreceTomar: false,
      }
  }
}

// El lead al que lleva «Abrir»: el que ya tiene el número, o el que lo tiene como extra, si quien
// mira lo puede ver.
export function leadAbrible(verificacion: Verificacion): string | null {
  if (verificacion.estado === 'existe') {
    return verificacion.leadId
  }
  if (verificacion.estado === 'libre' && verificacion.alterno?.estado === 'existe') {
    return verificacion.alterno.leadId
  }
  return null
}
