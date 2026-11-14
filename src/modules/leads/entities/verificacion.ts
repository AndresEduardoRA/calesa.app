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

// Dónde figura el número en el otro lead: como su principal o como uno de sus extras. Sin la clave, el principal (el caso de siempre);
// la base sólo la manda cuando es un extra.
export type DondeFigura = 'principal' | 'extra'

// Un número libre que figura en otro lead sin que eso lo impida (como extra al dar de alta o cambiar el principal; como principal al agregar
// un extra con la regla apagada): se avisa, no bloquea. Dice de él lo mismo que el principal: nombre y número si se ve, y si no, sólo quién
// lo tiene.
export type Alterno =
  | {
      estado: 'existe'
      leadId: string
      numeros: NumerosDeLead
      nombre: string
      esMio: boolean
      como: DondeFigura
    }
  | { estado: 'de_otro'; dueno: string | null; como: DondeFigura }

export type Verificacion =
  // `alterno`: figura como teléfono extra de otro lead. `esExtra`: ya es un extra de este lead (sólo
  // al cambiar el principal: al cambiarlo sale de los extras).
  | { estado: 'libre'; alterno?: Alterno; esExtra?: boolean }
  // Sin dueño: invisible hasta que alguien lo toma al registrar el teléfono. `como: 'extra'`: es un extra de ese lead (con la regla encendida).
  | { estado: 'limbo'; como?: 'extra' }
  // Es un lead que esta persona puede ver. `como: 'extra'`: lo tiene como teléfono extra (con la regla encendida).
  | {
      estado: 'existe'
      leadId: string
      numeros: NumerosDeLead
      nombre: string
      esMio: boolean
      como?: 'extra'
    }
  // Lo tiene otra persona: sólo se sabe de quién, nada más del lead. `duenoId` (si la base lo manda) deja escribirle por chat.
  | { estado: 'de_otro'; dueno: string | null; duenoId?: string; como?: 'extra' }
  // Es el principal de este mismo lead (sólo al cambiarlo): no hay nada que cambiar.
  | { estado: 'mismo' }

const esquemaComo = z.enum(['principal', 'extra']).optional()

const esquemaAlterno = z.discriminatedUnion('estado', [
  z.object({
    estado: z.literal('existe'),
    como: esquemaComo,
    lead_id: z.guid(),
    ...CAMPOS_DE_NUMEROS,
    nombre: z.string(),
    es_mio: z.boolean(),
  }),
  z.object({
    estado: z.literal('de_otro'),
    como: esquemaComo,
    dueno: z.string().nullable().optional(),
  }),
])

const esquema = z.discriminatedUnion('estado', [
  z.object({
    estado: z.literal('libre'),
    alterno: esquemaAlterno.optional(),
    es_extra: z.boolean().optional(),
  }),
  z.object({ estado: z.literal('limbo'), como: z.literal('extra').optional() }),
  z.object({
    estado: z.literal('existe'),
    como: z.literal('extra').optional(),
    lead_id: z.guid(),
    ...CAMPOS_DE_NUMEROS,
    nombre: z.string(),
    es_mio: z.boolean(),
  }),
  z.object({
    estado: z.literal('de_otro'),
    como: z.literal('extra').optional(),
    dueno: z.string().nullable().optional(),
    dueno_id: z.guid().nullable().optional(),
  }),
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
      como: lectura.como ?? 'extra',
    }
  }
  return { estado: 'de_otro', dueno: lectura.dueno ?? null, como: lectura.como ?? 'extra' }
}

type Lectura = z.infer<typeof esquema>

function comoDesde(como: 'extra' | undefined): { como?: 'extra' } {
  return como ? { como } : {}
}

function existeDesde(lectura: Extract<Lectura, { estado: 'existe' }>): Verificacion {
  return {
    estado: 'existe',
    leadId: lectura.lead_id,
    numeros: numerosDesde(lectura),
    nombre: lectura.nombre,
    esMio: lectura.es_mio,
    ...comoDesde(lectura.como),
  }
}

function deOtroDesde(lectura: Extract<Lectura, { estado: 'de_otro' }>): Verificacion {
  return {
    estado: 'de_otro',
    dueno: lectura.dueno ?? null,
    ...(lectura.dueno_id ? { duenoId: lectura.dueno_id } : {}),
    ...comoDesde(lectura.como),
  }
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
    case 'mismo':
      return { estado: 'mismo' }
    case 'limbo':
      return { estado: 'limbo', ...comoDesde(lectura.como) }
    case 'existe':
      return existeDesde(lectura)
    case 'de_otro':
      return deOtroDesde(lectura)
  }
}

// Lo que se le dice a quien tipea, y si deja seguir. «Lo tiene …» no lleva acción en el texto: el enlace
// «Escribirle por chat» lo pone la pantalla (`features/chat/`) con `duenoId`.
export type AvisoDeTelefono = {
  tono: 'neutro' | 'aviso' | 'peligro'
  texto: string
  // Con este teléfono no se puede crear otro lead (ni cambiar el principal de este).
  bloquea: boolean
  // Se ofrece «Tomar lead».
  ofreceTomar: boolean
}

// En el alta un número sin dueño se puede tomar; al cambiar el principal de un lead, no: sólo se dice. En `extra` (agregar un teléfono
// extra a un lead) cada texto habla de un extra.
export type ContextoDeVerificacion = 'alta' | 'cambio' | 'extra'

// « (N.º 1.234)» si se ve alguno de los números del lead; nada si no.
function conNumero(numeros: NumerosDeLead): string {
  const escrito = numeroEnFrase(numeros)
  return escrito === null ? '' : ` (${escrito})`
}

function textoDeAlterno(alterno: Alterno): string {
  if (alterno.como === 'principal') {
    return alterno.estado === 'existe'
      ? `Es el teléfono principal de ${alterno.nombre}${conNumero(alterno.numeros)}.`
      : `Es el teléfono principal de un lead de ${alterno.dueno ?? 'otra persona'}.`
  }
  if (alterno.estado === 'existe') {
    return `Figura como teléfono extra de ${alterno.nombre}${conNumero(alterno.numeros)}.`
  }
  return `Figura como teléfono extra de un lead de ${alterno.dueno ?? 'otra persona'}.`
}

// «, como teléfono extra» cuando el número que ya está en otro lead es un extra suyo (con la regla encendida).
const COMO_EXTRA = ', como teléfono extra'

function aviso(
  tono: AvisoDeTelefono['tono'],
  texto: string,
  bloquea = false,
  ofreceTomar = false,
): AvisoDeTelefono {
  return { tono, texto, bloquea, ofreceTomar }
}

function avisoDeLibre(
  verificacion: Extract<Verificacion, { estado: 'libre' }>,
  contexto: ContextoDeVerificacion,
): AvisoDeTelefono {
  if (verificacion.alterno) {
    return aviso('aviso', textoDeAlterno(verificacion.alterno))
  }
  if (verificacion.esExtra && contexto === 'extra') {
    return aviso('peligro', 'Ese número ya está en este lead.', true)
  }
  if (verificacion.esExtra) {
    return aviso('neutro', 'Ya es un teléfono extra de este lead: pasará a ser el principal.')
  }
  return aviso('neutro', '')
}

function avisoDeLimbo(contexto: ContextoDeVerificacion): AvisoDeTelefono {
  if (contexto === 'extra') {
    return aviso('peligro', 'Ya lo tiene un lead sin dueño. No se puede usar este número.', true)
  }
  if (contexto === 'cambio') {
    return aviso('peligro', 'Ya existe, sin dueño. No se puede usar este número.', true)
  }
  return aviso('aviso', 'Sin dueño.', false, true)
}

function avisoDeExiste(
  verificacion: Extract<Verificacion, { estado: 'existe' }>,
  contexto: ContextoDeVerificacion,
): AvisoDeTelefono {
  const nombre = `${verificacion.nombre}${conNumero(verificacion.numeros)}`
  if (contexto === 'extra') {
    return aviso(
      'peligro',
      `Ya es de ${nombre}. Un teléfono extra no puede repetirse en otro lead.`,
      true,
    )
  }
  const como = verificacion.como === 'extra' ? COMO_EXTRA : ''
  return aviso(
    'peligro',
    `Ya existe: ${nombre}${como}${verificacion.esMio ? ', y es tuyo' : ''}.`,
    true,
  )
}

export function avisoDeVerificacion(
  verificacion: Verificacion,
  contexto: ContextoDeVerificacion = 'alta',
): AvisoDeTelefono {
  switch (verificacion.estado) {
    case 'libre':
      return avisoDeLibre(verificacion, contexto)
    case 'limbo':
      return avisoDeLimbo(contexto)
    case 'existe':
      return avisoDeExiste(verificacion, contexto)
    case 'de_otro': {
      const como = verificacion.como === 'extra' && contexto !== 'extra' ? COMO_EXTRA : ''
      return aviso('peligro', `Lo tiene ${verificacion.dueno ?? 'otra persona'}${como}.`, true)
    }
    case 'mismo':
      return aviso('aviso', 'Ese es el teléfono principal de este lead.', true)
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
