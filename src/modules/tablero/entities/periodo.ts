// El período del tablero: vive en la URL (`?periodo=`). Las fechas son días del calendario de la empresa
// (`YYYY-MM-DD`), calculados con su zona horaria y nunca con la del servidor. Cero I/O.
import { sumarDias } from '@/shared/lib/fechas'

export const PERIODOS = ['mes', 'mes-anterior', '90d'] as const

export type Periodo = (typeof PERIODOS)[number]

export type VentanaDelPeriodo = {
  desde: string
  hasta: string
  etiqueta: string
}

const ETIQUETAS: Record<Periodo, string> = {
  mes: 'Este mes',
  'mes-anterior': 'Mes anterior',
  '90d': 'Últimos 90 días',
}

export function etiquetaDelPeriodo(periodo: Periodo): string {
  return ETIQUETAS[periodo]
}

// Un valor ausente, repetido o desconocido es «mes».
export function periodoDesde(valor: unknown): Periodo {
  return PERIODOS.find((periodo) => periodo === valor) ?? 'mes'
}

function primeroDelMes(dia: string): string {
  return `${dia.slice(0, 7)}-01`
}

// `hoy` es el día de hoy en la zona de la empresa. La aritmética es de calendario: el día 1 y el último día de un
// mes salen de `sumarDias`, sin `Date` local.
export function ventanaDelPeriodo(periodo: Periodo, hoy: string): VentanaDelPeriodo {
  const etiqueta = ETIQUETAS[periodo]
  const primero = primeroDelMes(hoy)
  if (periodo === 'mes') {
    return { desde: primero, hasta: hoy, etiqueta }
  }
  if (periodo === 'mes-anterior') {
    const ultimoDelAnterior = sumarDias(primero, -1)
    return { desde: primeroDelMes(ultimoDelAnterior), hasta: ultimoDelAnterior, etiqueta }
  }
  return { desde: sumarDias(hoy, -89), hasta: hoy, etiqueta }
}
