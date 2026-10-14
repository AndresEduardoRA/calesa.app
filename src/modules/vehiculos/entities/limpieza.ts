// La limpieza automática vista desde la pantalla: qué dice la base de un vehículo y qué se le
// avisa a la persona. La regla (cuándo termina, qué lo retiene, a qué día se va) vive en la base:
// acá sólo se lee y se dice. Nada de esto decide qué se limpia.
import { z } from 'zod'
import { diaEnZona, formatearDiaYMes, sumarDias } from '@/shared/lib/fechas'

// Cuántos días antes se avisa: «Se limpiará pronto» son los vehículos que se limpian en los
// próximos 3 días (hoy incluido). El filtro y el banner usan este mismo número.
export const VENTANA_DE_AVISO_DIAS = 3

// Lo que dice `vehiculo_limpieza()` de un vehículo. `aplica: false` = no se limpia nunca (lo
// cargado a mano, o un origen manual).
export type LimpiezaDeVehiculo =
  | { aplica: false }
  | {
      aplica: true
      // El interruptor general: apagado, la pantalla no dice nada.
      activa: boolean
      diasGracia: number
      // `YYYY-MM-DD` en la zona de la empresa; null = hoy no hay fecha (con ancla, o la subasta no
      // terminó, o está conservado).
      fecha: string | null
      conservado: boolean
      conservadoPorNombre: string | null
      // ISO.
      conservadoEn: string | null
      conservadoPorMi: boolean
    }

const esquema = z.discriminatedUnion('aplica', [
  z.object({ aplica: z.literal(false) }),
  z.object({
    aplica: z.literal(true),
    activa: z.boolean(),
    dias_gracia: z.number().int(),
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    conservado: z.boolean(),
    conservado_por_nombre: z.string().nullable(),
    conservado_en: z.string().nullable(),
    conservado_por_mi: z.boolean(),
  }),
])

// null = lo que la base no entendió (no se dibuja nada: un aviso de más es peor que ninguno).
export function limpiezaDesdeRespuesta(respuesta: unknown): LimpiezaDeVehiculo | null {
  const leida = esquema.safeParse(respuesta)
  if (!leida.success) {
    return null
  }
  const d = leida.data
  if (!d.aplica) {
    return { aplica: false }
  }
  return {
    aplica: true,
    activa: d.activa,
    diasGracia: d.dias_gracia,
    fecha: d.fecha,
    conservado: d.conservado,
    conservadoPorNombre: d.conservado_por_nombre,
    conservadoEn: d.conservado_en,
    conservadoPorMi: d.conservado_por_mi,
  }
}

// Hasta qué día (inclusive) cuenta como «pronto», dado hoy en la zona de la empresa.
export function limiteDeAviso(hoy: string, ventana: number = VENTANA_DE_AVISO_DIAS): string {
  return sumarDias(hoy, ventana)
}

export function seLimpiaPronto(
  fecha: string | null,
  hoy: string,
  ventana: number = VENTANA_DE_AVISO_DIAS,
): boolean {
  return fecha !== null && fecha <= limiteDeAviso(hoy, ventana)
}

// El día de hoy en la zona de la empresa, para comparar con las fechas de la base.
export function hoyEnZona(zona: string, ahora: Date = new Date()): string {
  return diaEnZona(ahora.toISOString(), { zona })
}

// Qué muestra la ficha:
//  · `oculto` — no aplica, el interruptor está apagado o no hay nada que decir;
//  · `pronto` — se limpia dentro de la ventana: banner arriba, con «Conservar»;
//  · `lejos` — tiene fecha pero falta: una línea discreta en el bloque de la subasta;
//  · `conservado` — está marcado: «Se conserva», con «Quitar».
export type AvisoDeLimpieza =
  | { tipo: 'oculto' }
  | { tipo: 'pronto' | 'lejos'; dia: string }
  | { tipo: 'conservado'; quien: string | null; dia: string | null }

export function avisoDeLimpieza(
  limpieza: LimpiezaDeVehiculo | null,
  hoy: string,
  zona: string,
): AvisoDeLimpieza {
  if (limpieza === null || !limpieza.aplica || !limpieza.activa) {
    return { tipo: 'oculto' }
  }
  if (limpieza.conservado) {
    return {
      tipo: 'conservado',
      quien: limpieza.conservadoPorMi ? 'ti' : limpieza.conservadoPorNombre,
      dia: limpieza.conservadoEn ? diaEnZona(limpieza.conservadoEn, { zona }) : null,
    }
  }
  if (limpieza.fecha === null) {
    return { tipo: 'oculto' }
  }
  return { tipo: seLimpiaPronto(limpieza.fecha, hoy) ? 'pronto' : 'lejos', dia: limpieza.fecha }
}

export function textoDeAviso(aviso: AvisoDeLimpieza): string {
  switch (aviso.tipo) {
    case 'oculto':
      return ''
    case 'pronto':
      return `Se limpiará el ${formatearDiaYMes(aviso.dia)}`
    case 'lejos':
      return `Si nadie lo usa, se limpiará el ${formatearDiaYMes(aviso.dia)}`
    case 'conservado': {
      const cuando = aviso.dia ? ` el ${formatearDiaYMes(aviso.dia)}` : ''
      if (aviso.quien === 'ti') {
        return `Se conserva · lo marcaste tú${cuando}`
      }
      return aviso.quien ? `Se conserva · lo marcó ${aviso.quien}${cuando}` : `Se conserva${cuando}`
    }
  }
}

// Lo que cuenta la pantalla de la papelera de la última noche: «12 a la papelera · 3 se quedaron
// (2 vinculados, 1 para conservar)». Las etiquetas de las anclas son de aquí: la base manda
// códigos.
const ETIQUETA_DE_ANCLA: Record<string, [string, string]> = {
  conservar: ['marcado para conservar', 'marcados para conservar'],
  vinculo: ['vinculado a un lead', 'vinculados a un lead'],
  fase: ['en una fase posterior', 'en una fase posterior'],
  documentos: ['con documentos', 'con documentos'],
  gastos: ['con gastos', 'con gastos'],
  pagos: ['con pagos', 'con pagos'],
  vitrina: ['publicado en la vitrina', 'publicados en la vitrina'],
  bloqueo: ['con algo registrado', 'con algo registrado'],
  ocupado: ['en edición en ese momento', 'en edición en ese momento'],
  error: ['que no se pudo mover', 'que no se pudieron mover'],
}

export type UltimaLimpieza = {
  // `YYYY-MM-DD`.
  fecha: string
  movidos: number
  saltados: Record<string, number>
  pendientes: number
}

const esquemaUltima = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  movidos: z.number().int(),
  saltados: z.record(z.string(), z.number().int()),
  pendientes: z.number().int(),
})

export function ultimaLimpiezaDesde(respuesta: unknown): UltimaLimpieza | null {
  const leida = esquemaUltima.safeParse(respuesta)
  return leida.success ? leida.data : null
}

export function resumenDeUltimaLimpieza(ultima: UltimaLimpieza): string {
  const movidos =
    ultima.movidos === 0
      ? 'no mandó nada a la papelera'
      : ultima.movidos === 1
        ? '1 a la papelera'
        : `${String(ultima.movidos)} a la papelera`
  const quedaron = Object.entries(ultima.saltados)
    .filter(([, cuantos]) => cuantos > 0)
    .map(([ancla, cuantos]) => {
      const par = ETIQUETA_DE_ANCLA[ancla]
      const etiqueta = par ? (cuantos === 1 ? par[0] : par[1]) : 'retenidos'
      return `${String(cuantos)} ${etiqueta}`
    })
  const total = Object.values(ultima.saltados).reduce((suma, cuantos) => suma + cuantos, 0)
  const parte =
    total === 0
      ? ''
      : ` · ${String(total)} se ${total === 1 ? 'quedó' : 'quedaron'} (${quedaron.join(', ')})`
  const resto =
    ultima.pendientes > 0
      ? ` · ${String(ultima.pendientes)} ${ultima.pendientes === 1 ? 'espera' : 'esperan'} a la noche siguiente`
      : ''
  return `Última limpieza automática: ${formatearDiaYMes(ultima.fecha)} · ${movidos}${parte}${resto}`
}
