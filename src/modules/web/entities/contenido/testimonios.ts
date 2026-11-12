import { z } from 'zod'
import { formatearFecha } from '@/shared/lib/fechas'

// Los testimonios de la web pública (8.02-2). `web_testimonios` es una tabla de configuración de decenas de filas: sin índice por `orden` ni medición
// (`escala.md`; sólo la PK). El texto es texto plano: `web.testimonios` lo entrega tal cual y el sitio lo escapa.
export const TOPE_DE_TESTIMONIOS = 100
export const LARGO_DE_CLIENTE = 120
export const LARGO_DE_CIUDAD = 80
export const LARGO_DE_VEHICULO = 120
export const LARGO_DE_TEXTO = 1000
export const LARGO_DE_CANAL = 80

export const MOTIVO_SIN_CONSENTIMIENTO = 'Falta registrar el consentimiento.'

export type Testimonio = {
  id: string
  cliente: string
  ciudad: string | null
  texto: string
  vehiculo: string | null
  fotoRuta: string | null
  publicado: boolean
  orden: number
  consentPor: string | null
  consentEn: string | null
  consentCanal: string | null
  consentCiudad: boolean
  consentVehiculo: boolean
  consentFoto: boolean
  consentRetiradoEn: string | null
  // La versión de la fila (`actualizado_en`): se espera al guardar, consentir, retirar o eliminar.
  actualizadoEn: string
}

export const COLUMNAS_DE_TESTIMONIO =
  'id, cliente, ciudad, texto, vehiculo, foto_ruta, publicado, orden, consent_por, consent_en, consent_canal, consent_ciudad, consent_vehiculo, consent_foto, consent_retirado_en, actualizado_en'

const esquemaDeFila = z
  .object({
    id: z.guid(),
    cliente: z.string(),
    ciudad: z.string().nullable(),
    texto: z.string(),
    vehiculo: z.string().nullable(),
    foto_ruta: z.string().nullable(),
    publicado: z.boolean(),
    orden: z.number(),
    consent_por: z.string().nullable(),
    consent_en: z.string().nullable(),
    consent_canal: z.string().nullable(),
    consent_ciudad: z.boolean(),
    consent_vehiculo: z.boolean(),
    consent_foto: z.boolean(),
    consent_retirado_en: z.string().nullable(),
    actualizado_en: z.string(),
  })
  .transform((f): Testimonio => ({
    id: f.id,
    cliente: f.cliente,
    ciudad: f.ciudad,
    texto: f.texto,
    vehiculo: f.vehiculo,
    fotoRuta: f.foto_ruta,
    publicado: f.publicado,
    orden: f.orden,
    consentPor: f.consent_por,
    consentEn: f.consent_en,
    consentCanal: f.consent_canal,
    consentCiudad: f.consent_ciudad,
    consentVehiculo: f.consent_vehiculo,
    consentFoto: f.consent_foto,
    consentRetiradoEn: f.consent_retirado_en,
    actualizadoEn: f.actualizado_en,
  }))

/** Las filas de `web_testimonios`; nulo si alguna no tiene la forma esperada. */
export function testimoniosDesde(datos: unknown): Testimonio[] | null {
  const leido = z.array(esquemaDeFila).safeParse(datos)
  return leido.success ? leido.data : null
}

/** El orden de un testimonio nuevo: al final de los que hay. */
export function ordenSiguienteDeTestimonio(testimonios: readonly Testimonio[]): number {
  return testimonios.length === 0 ? 0 : Math.max(...testimonios.map((t) => t.orden)) + 1
}

export type EstadoDeConsentimiento = 'sin' | 'vigente' | 'retirado'

/** El consentimiento de un testimonio: sin registrar, vigente o retirado. Vigente exige el trío (quién, cuándo, canal) y sin retiro. */
export function estadoDeConsentimiento(
  t: Pick<Testimonio, 'consentPor' | 'consentEn' | 'consentCanal' | 'consentRetiradoEn'>,
): EstadoDeConsentimiento {
  if (t.consentPor === null || t.consentEn === null || t.consentCanal === null) return 'sin'
  return t.consentRetiradoEn === null ? 'vigente' : 'retirado'
}

/** Sólo con un consentimiento vigente se puede publicar (la base lo hace cumplir con un trigger). */
export function puedePublicar(t: Parameters<typeof estadoDeConsentimiento>[0]): boolean {
  return estadoDeConsentimiento(t) === 'vigente'
}

/** Por qué no se puede publicar; nulo si se puede. */
export function motivoSinPublicar(t: Parameters<typeof estadoDeConsentimiento>[0]): string | null {
  return puedePublicar(t) ? null : MOTIVO_SIN_CONSENTIMIENTO
}

/** La línea de la lista: lo que dice la fila del consentimiento (sin el nombre de quien lo registró). */
export function resumenDeConsentimiento(
  t: Pick<Testimonio, 'consentPor' | 'consentEn' | 'consentCanal' | 'consentRetiradoEn'>,
): string {
  const estado = estadoDeConsentimiento(t)
  if (estado === 'sin') return 'Sin consentimiento'
  if (estado === 'retirado' && t.consentRetiradoEn !== null) {
    return `Consentimiento retirado el ${formatearFecha(t.consentRetiradoEn)}`
  }
  return t.consentEn === null
    ? 'Consentimiento registrado'
    : `Consentimiento registrado el ${formatearFecha(t.consentEn)}`
}
