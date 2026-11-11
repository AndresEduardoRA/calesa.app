// Lo que Inicio pide a los leads: sus recordatorios de hoy y los leads que nadie contactó. Reglas puras (cero I/O):
// los instantes que acotan cada lectura y la ruta a donde lleva cada fila.
import type { Resultado } from '@/shared/lib/errores'
import { diaEnZona, diaSiguiente, inicioDelDia } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import { CLAVE_DE_SECCION } from './ficha'

export type RecordatorioDeHoy = {
  id: string
  titulo: string
  // El instante en que hay que recordarlo (ISO).
  recordarEn: string
  // Un recordatorio puede no tener lead (o su lead ya no se ve): entonces no lleva enlace.
  leadId: string | null
  leadNombre: string | null
}

export type LeadSinSeguimiento = {
  id: string
  nombre: string
  creadoEn: string
}

// Una lista corta de un bloque: a lo sumo `tope` filas y si había más (se pide `tope + 1`).
export type ListaCorta<T> = { filas: T[]; hayMas: boolean }

export type LectorDeRecordatoriosDeHoy = (pedido: {
  // El instante en que termina «hoy» en la zona de la empresa (`finDeHoy`).
  hasta: string
  tope: number
}) => Promise<Resultado<ListaCorta<RecordatorioDeHoy>>>

export type LectorDeLeadsSinSeguimiento = (pedido: {
  // Sólo los creados antes de este instante (`creadoAntesDe`).
  creadosAntesDe: string
  tope: number
}) => Promise<Resultado<ListaCorta<LeadSinSeguimiento>>>

const MS_POR_HORA = 3_600_000

// El instante en que empieza el día siguiente al de `ahora`, en la zona de la empresa: «hoy» llega hasta acá, y lo que
// venció antes (y sigue sin completarse) también cuenta.
export function finDeHoy(ahora: string, zona: string): string {
  return inicioDelDia(diaSiguiente(diaEnZona(ahora, { zona })), { zona })
}

// Un lead «sin seguimiento» es uno que lleva más de 24 h sin ningún contacto: lo recién creado no se le reclama a nadie.
export function creadoAntesDe(ahora: string): string {
  return new Date(Date.parse(ahora) - 24 * MS_POR_HORA).toISOString()
}

// La ficha del lead abierta en sus seguimientos.
export function rutaDeSeguimientos(leadId: string): string {
  return `${RUTAS.leads}/${leadId}?${CLAVE_DE_SECCION}=seguimientos`
}
