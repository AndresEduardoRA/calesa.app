// Los vehículos de un lead, vistos desde su ficha: los vinculados (el vínculo activo: un vehículo
// tiene un solo lead), los interesados (con su nota) y los vínculos que ya se cerraron. Todo llega ya
// recortado por la base: lo que quien mira no ve no llega ni se cuenta (`lead_vehiculos()`).
import { z } from 'zod'
import { formatearDiaYMes } from '@/shared/lib/fechas'

export const TOPE_DE_NOTA = 500

export type VehiculoDelLead = {
  id: string
  numero: number
  titulo: string
  // La versión del vehículo: la pide vincular y desvincular.
  actualizadoEn: string
  origenNombre: string | null
  // La miniatura de la portada (ruta en el bucket `vehiculos`); null = sin fotos.
  portada: string | null
  // Si quien mira puede editar el vehículo: es lo que pide desvincular.
  editable: boolean
}

export type VehiculoVinculado = VehiculoDelLead & { desde: string | null }

export type VehiculoInteresado = VehiculoDelLead & {
  nota: string | null
  marcadoEn: string
  // También está vinculado a este lead.
  vinculadoAqui: boolean
}

// Una línea del historial: un vínculo que ya se cerró, sin personas.
export type VinculoCerrado = {
  vehiculoId: string
  titulo: string
  numero: number
  desde: string
  hasta: string
}

export type VehiculosDelLead = {
  vinculados: VehiculoVinculado[]
  interesados: VehiculoInteresado[]
  historial: VinculoCerrado[]
  // Cartera y `leads.editar`: vincular y marcar interés. Desvincular pide sólo editar el vehículo.
  puedoActuar: boolean
}

const base = {
  id: z.guid(),
  numero: z.number(),
  titulo: z.string(),
  actualizado_en: z.string(),
  origen_nombre: z.string().nullable(),
  portada: z.string().nullable(),
  editable: z.boolean(),
}

const comoVehiculo = (fila: {
  id: string
  numero: number
  titulo: string
  actualizado_en: string
  origen_nombre: string | null
  portada: string | null
  editable: boolean
}): VehiculoDelLead => ({
  id: fila.id,
  numero: fila.numero,
  titulo: fila.titulo,
  actualizadoEn: fila.actualizado_en,
  origenNombre: fila.origen_nombre,
  portada: fila.portada,
  editable: fila.editable,
})

const esquemaDeVehiculosDelLead = z.object({
  vinculados: z.array(z.object({ ...base, desde: z.string().nullable() })),
  interesados: z.array(
    z.object({
      ...base,
      nota: z.string().nullable(),
      marcado_en: z.string(),
      vinculado_aqui: z.boolean(),
    }),
  ),
  historial: z.array(
    z.object({
      vehiculo_id: z.guid(),
      titulo: z.string(),
      numero: z.number(),
      desde: z.string(),
      hasta: z.string(),
    }),
  ),
  puedo_actuar: z.boolean(),
})

// Lo que devuelve `lead_vehiculos()`. Una forma rota es `null` (no «no tiene vehículos»).
export function vehiculosDelLeadDesde(datos: unknown): VehiculosDelLead | null {
  const leido = esquemaDeVehiculosDelLead.safeParse(datos)
  if (!leido.success) {
    return null
  }
  const { vinculados, interesados, historial, puedo_actuar } = leido.data
  return {
    vinculados: vinculados.map((fila) => ({ ...comoVehiculo(fila), desde: fila.desde })),
    interesados: interesados.map((fila) => ({
      ...comoVehiculo(fila),
      nota: fila.nota,
      marcadoEn: fila.marcado_en,
      vinculadoAqui: fila.vinculado_aqui,
    })),
    historial: historial.map((fila) => ({
      vehiculoId: fila.vehiculo_id,
      titulo: fila.titulo,
      numero: fila.numero,
      desde: fila.desde,
      hasta: fila.hasta,
    })),
    puedoActuar: puedo_actuar,
  }
}

// Un vehículo encontrado al buscar desde el lead, con cómo está frente a ese lead.
export type CandidatoDeVinculo = VehiculoDelLead & {
  vinculadoAqui: boolean
  vinculadoAOtro: boolean
  // El lead al que está vinculado, sólo si quien mira lo ve.
  otroLead: { nombre: string; numero: number } | null
  // Quien mira tiene también el lead actual en su cartera: puede pasarlo a este.
  reemplazable: boolean
  interesado: boolean
}

const esquemaDeCandidatos = z.array(
  z.object({
    ...base,
    vinculado_aqui: z.boolean(),
    vinculado_a_otro: z.boolean(),
    otro_lead: z.object({ nombre: z.string(), numero: z.number() }).nullable(),
    reemplazable: z.boolean(),
    interesado: z.boolean(),
  }),
)

// Lo que devuelve `vehiculos_para_lead()`. Una fila que no cumple se descarta.
export function candidatosDesde(datos: unknown): CandidatoDeVinculo[] {
  const leido = esquemaDeCandidatos.safeParse(datos)
  if (!leido.success) {
    return []
  }
  return leido.data.map((fila) => ({
    ...comoVehiculo(fila),
    vinculadoAqui: fila.vinculado_aqui,
    vinculadoAOtro: fila.vinculado_a_otro,
    otroLead: fila.otro_lead,
    reemplazable: fila.reemplazable,
    interesado: fila.interesado,
  }))
}

// Lo que se puede hacer con un vehículo encontrado: vincular (o reemplazar al lead que tiene), y si
// no, por qué. Marcar interés no depende del vínculo.
export type VinculoPosible =
  { tipo: 'vincular' } | { tipo: 'reemplazar'; anterior: string } | { tipo: 'no'; motivo: string }

export const MOTIVO_YA_VINCULADO = 'Ya está vinculado a este lead.'
export const MOTIVO_DE_OTRO_LEAD =
  'Está vinculado a otro lead. Para cambiarlo, desvincúlalo desde la ficha del vehículo.'
export const MOTIVO_SIN_EDICION = 'No puedes editar este vehículo.'

export function vinculoPosible(candidato: CandidatoDeVinculo): VinculoPosible {
  if (candidato.vinculadoAqui) {
    return { tipo: 'no', motivo: MOTIVO_YA_VINCULADO }
  }
  if (!candidato.editable) {
    return { tipo: 'no', motivo: MOTIVO_SIN_EDICION }
  }
  if (candidato.vinculadoAOtro) {
    return candidato.reemplazable && candidato.otroLead
      ? { tipo: 'reemplazar', anterior: nombreConNumero(candidato.otroLead) }
      : { tipo: 'no', motivo: MOTIVO_DE_OTRO_LEAD }
  }
  return { tipo: 'vincular' }
}

export const AVISO_DE_VINCULO =
  'Quien tenga este lead en su cartera podrá ver este vehículo y, si su rol lo permite, editarlo.'

export function nombreConNumero(lead: { nombre: string; numero: number }): string {
  return `«${lead.nombre}» (#${String(lead.numero)})`
}

// «Toyota Corolla · #12»: cómo se nombra un vehículo en una línea.
export function rotuloDeVehiculo(vehiculo: { titulo: string; numero: number }): string {
  return `${vehiculo.titulo} · #${String(vehiculo.numero)}`
}

// La nota de un interés: hasta 500 caracteres, sin espacios a los lados (como la guarda la base).
export function validarNota(
  nota: string,
): { ok: true; nota: string | null } | { ok: false; motivo: string } {
  const limpia = nota.trim()
  if (limpia.length > TOPE_DE_NOTA) {
    return { ok: false, motivo: `La nota no puede pasar de ${String(TOPE_DE_NOTA)} caracteres.` }
  }
  return { ok: true, nota: limpia === '' ? null : limpia }
}

// Lo que responden las RPC de escritura.
const esquemaDeVinculo = z.object({
  resultado: z.enum(['vinculado', 'desvinculado', 'reemplazado', 'sin_cambios']),
  actualizado_en: z.string(),
  limpieza_el: z.string().nullable(),
})
export type RespuestaDeVinculo = {
  resultado: z.infer<typeof esquemaDeVinculo>['resultado']
  actualizadoEn: string
  // El día (en la zona de la empresa) en que la limpieza automática se lo llevaría, si le toca.
  limpiezaEl: string | null
}
export function respuestaDeVinculoDesde(datos: unknown): RespuestaDeVinculo | null {
  const leido = esquemaDeVinculo.safeParse(datos)
  return leido.success
    ? {
        resultado: leido.data.resultado,
        actualizadoEn: leido.data.actualizado_en,
        limpiezaEl: leido.data.limpieza_el,
      }
    : null
}

const esquemaDeInteres = z.object({
  resultado: z.enum(['marcado', 'nota_cambiada', 'quitado', 'sin_cambios']),
  nota: z.string().nullable(),
})
export type RespuestaDeInteres = z.infer<typeof esquemaDeInteres>
export function respuestaDeInteresDesde(datos: unknown): RespuestaDeInteres | null {
  const leido = esquemaDeInteres.safeParse(datos)
  return leido.success ? leido.data : null
}

// Cómo se dice cada resultado, entero. `anterior` es el lead que pierde el vehículo al reemplazarlo.
export function textoDeVinculo(
  respuesta: RespuestaDeVinculo,
  vehiculo: { titulo: string; numero: number },
  anterior?: string,
): string {
  const rotulo = `«${rotuloDeVehiculo(vehiculo)}»`
  switch (respuesta.resultado) {
    case 'sin_cambios':
      return `${rotulo} ya estaba así.`
    case 'reemplazado':
      return `Se vinculó ${rotulo} a este lead${anterior ? `; ya no está vinculado a ${anterior}` : ''}.`
    case 'desvinculado':
      return (
        `Se desvinculó ${rotulo}.` +
        (respuesta.limpiezaEl
          ? ` Como es de una subasta que nadie compró, la limpieza automática se lo llevará el ${formatearDiaYMes(respuesta.limpiezaEl)} si nadie lo conserva.`
          : '')
      )
    case 'vinculado':
      return `Se vinculó ${rotulo} a este lead.`
  }
}

export function textoDeInteres(
  respuesta: RespuestaDeInteres,
  vehiculo: { titulo: string; numero: number },
): string {
  const rotulo = `«${rotuloDeVehiculo(vehiculo)}»`
  switch (respuesta.resultado) {
    case 'sin_cambios':
      return `El interés en ${rotulo} ya estaba así.`
    case 'nota_cambiada':
      return `Se cambió la nota del interés en ${rotulo}.`
    case 'quitado':
      return `Se quitó el interés en ${rotulo}.`
    case 'marcado':
      return `Se marcó el interés en ${rotulo}.`
  }
}
