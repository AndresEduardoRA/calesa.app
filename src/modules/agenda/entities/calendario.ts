// El calendario de la agenda (paso 7.07-1): vistas, semanas, rangos y agrupación por día. Puro: cero I/O. Los días cruzan como `YYYY-MM-DD`
// (días del calendario de la empresa) y los instantes, como ISO; el corte de un día es SIEMPRE el de la zona de la empresa (un día con
// cambio de horario dura 23 o 25 horas: nunca «+24 h»).
import { diaEnZona, diaSiguiente, inicioDelDia, sumarDias } from '@/shared/lib/fechas'
import { CLASES_DE_AGENDA, type ClaveDeClase } from './agenda'

export const VISTAS = ['mes', 'semana', 'dia'] as const
export type Vista = (typeof VISTAS)[number]

// La semana empieza el lunes (D1 del 7.07-1): cambiarlo es esta constante (0 = domingo, 1 = lunes).
export const PRIMER_DIA_DE_LA_SEMANA = 1

const DIA_DEL_CALENDARIO = /^(\d{4})-(\d{2})-(\d{2})$/

export type DiaDeLaGrilla = { dia: string; delMes: boolean }

// Lo que no es una vista vuelve la de por defecto.
export function leerVista(valor: string | null | undefined, porDefecto: Vista): Vista {
  return VISTAS.find((vista) => vista === valor) ?? porDefecto
}

// `YYYY-MM-DD` que existe en el calendario (rechaza `2026-02-30` y `2026-13-01`); si no, `hoy`.
export function leerFecha(valor: string | null | undefined, hoy: string): string {
  const partes = valor ? DIA_DEL_CALENDARIO.exec(valor) : null
  if (!partes) {
    return hoy
  }
  const instante = new Date(`${valor}T00:00:00Z`)
  return !Number.isNaN(instante.getTime()) && instante.toISOString().slice(0, 10) === valor
    ? (valor as string)
    : hoy
}

// Día de la semana de un `YYYY-MM-DD`: 0 = domingo … 6 = sábado. No depende de la zona del proceso.
function diaDeLaSemana(dia: string): number {
  return new Date(`${dia}T00:00:00Z`).getUTCDay()
}

function primerDiaDelMes(dia: string): string {
  return `${dia.slice(0, 7)}-01`
}

function ultimoDiaDelMes(dia: string): string {
  return sumarDias(sumarMeses(primerDiaDelMes(dia), 1), -1)
}

// El `YYYY-MM-DD` del primer día de la semana que contiene al día.
function inicioDeLaSemana(dia: string): string {
  const atras = (diaDeLaSemana(dia) - PRIMER_DIA_DE_LA_SEMANA + 7) % 7
  return sumarDias(dia, -atras)
}

// Los siete días de la semana que contiene a la fecha, del primero al último.
export function diasDeLaSemana(fecha: string): string[] {
  const inicio = inicioDeLaSemana(fecha)
  return Array.from({ length: 7 }, (_, indice) => sumarDias(inicio, indice))
}

// Las filas de siete días de la grilla del mes: de la semana de su primer día a la de su último. De 4 a 6 filas, nunca más de 42 días.
export function semanasDelMes(fecha: string): DiaDeLaGrilla[][] {
  const mes = fecha.slice(0, 7)
  const primero = inicioDeLaSemana(primerDiaDelMes(fecha))
  const ultimo = diasDeLaSemana(ultimoDiaDelMes(fecha)).at(-1) ?? ultimoDiaDelMes(fecha)
  const filas: DiaDeLaGrilla[][] = []
  for (let inicio = primero; inicio <= ultimo; inicio = sumarDias(inicio, 7)) {
    filas.push(
      Array.from({ length: 7 }, (_, indice) => {
        const dia = sumarDias(inicio, indice)
        return { dia, delMes: dia.startsWith(mes) }
      }),
    )
  }
  return filas
}

// `YYYY-MM-DD` más o menos N meses, siempre en el día 1 (así 31 de enero + 1 mes no salta a marzo).
function sumarMeses(dia: string, meses: number): string {
  const anio = Number(dia.slice(0, 4))
  const mes = Number(dia.slice(5, 7)) - 1 + meses
  const instante = new Date(Date.UTC(anio, mes, 1))
  return instante.toISOString().slice(0, 10)
}

// El primer y el último día que dibuja una vista (el de la grilla, no sólo el del mes).
function extremosDe(vista: Vista, fecha: string): { primero: string; ultimo: string } {
  if (vista === 'dia') {
    return { primero: fecha, ultimo: fecha }
  }
  if (vista === 'semana') {
    const dias = diasDeLaSemana(fecha)
    return { primero: dias[0] ?? fecha, ultimo: dias[6] ?? fecha }
  }
  const filas = semanasDelMes(fecha)
  return { primero: filas[0]?.[0]?.dia ?? fecha, ultimo: filas.at(-1)?.[6]?.dia ?? fecha }
}

export type RangoDeAgenda = { desde: string; hasta: string }

// El rango que pide la vista a la base, semiabierto `[desde, hasta)`, en ISO UTC y con los cortes de día de la zona de la empresa.
export function rangoDe(vista: Vista, fecha: string, zona: string): RangoDeAgenda {
  const { primero, ultimo } = extremosDe(vista, fecha)
  return {
    desde: inicioDelDia(primero, { zona }),
    hasta: inicioDelDia(diaSiguiente(ultimo), { zona }),
  }
}

// Los días de calendario que cubre el rango de una vista. Cabe siempre en los 45 días de la base (`DIAS_MAXIMOS_DEL_RANGO`): el mes, en 42 como mucho.
export function diasDelRango(vista: Vista, fecha: string): number {
  const { primero, ultimo } = extremosDe(vista, fecha)
  return Math.round((Date.parse(ultimo) - Date.parse(primero)) / 86_400_000) + 1
}

// Agrupa por el día de la zona de la empresa en que cae cada cosa; dentro del día, por instante y luego por id (orden estable).
export function agruparPorDia<T extends { id: string }>(
  items: readonly T[],
  instanteDe: (item: T) => string,
  zona: string,
): Map<string, T[]> {
  const ordenados = [...items].sort(
    (a, b) =>
      Date.parse(instanteDe(a)) - Date.parse(instanteDe(b)) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
  const porDia = new Map<string, T[]>()
  for (const item of ordenados) {
    const dia = diaEnZona(instanteDe(item), { zona })
    porDia.set(dia, [...(porDia.get(dia) ?? []), item])
  }
  return porDia
}

// La fecha tras avanzar o retroceder `pasos` unidades de la vista: meses (al día 1), semanas o días.
export function moverFecha(vista: Vista, fecha: string, pasos: number): string {
  if (vista === 'mes') {
    return sumarMeses(fecha, pasos)
  }
  return sumarDias(fecha, vista === 'semana' ? pasos * 7 : pasos)
}

function formato(opciones: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es', { timeZone: 'UTC', ...opciones })
}

const instanteDe = (dia: string) => new Date(`${dia}T00:00:00Z`)

// «noviembre de 2026», «9 – 15 nov 2026», «martes 10 nov 2026»: el título del rango, en español.
export function tituloDelRango(vista: Vista, fecha: string): string {
  if (vista === 'mes') {
    return formato({ month: 'long', year: 'numeric' }).format(instanteDe(fecha))
  }
  if (vista === 'dia') {
    return `${formato({ weekday: 'long' }).format(instanteDe(fecha))} ${formato({ day: 'numeric', month: 'short', year: 'numeric' }).format(instanteDe(fecha))}`
  }
  const { primero, ultimo } = extremosDe('semana', fecha)
  const mismoMes = primero.slice(0, 7) === ultimo.slice(0, 7)
  const mismoAnio = primero.slice(0, 4) === ultimo.slice(0, 4)
  const corta = formato({ day: 'numeric', month: 'short' })
  const dia = formato({ day: 'numeric' })
  const completa = formato({ day: 'numeric', month: 'short', year: 'numeric' })
  if (mismoMes) {
    const [, mesYAnio = ''] = completa.format(instanteDe(ultimo)).split(/ (.*)/)
    return `${dia.format(instanteDe(primero))} – ${dia.format(instanteDe(ultimo))} ${mesYAnio}`
  }
  if (mismoAnio) {
    const anio = ultimo.slice(0, 4)
    return `${corta.format(instanteDe(primero))} – ${corta.format(instanteDe(ultimo))} ${anio}`
  }
  return `${completa.format(instanteDe(primero))} – ${completa.format(instanteDe(ultimo))}`
}

// «lun», «mar»…: el nombre corto del día de la semana de un `YYYY-MM-DD`.
export function nombreCortoDelDia(dia: string): string {
  return formato({ weekday: 'short' }).format(instanteDe(dia))
}

// «martes 10 nov»: el encabezado de un día en una lista.
export function encabezadoDelDia(dia: string): string {
  return `${formato({ weekday: 'long' }).format(instanteDe(dia))} ${formato({ day: 'numeric', month: 'short' }).format(instanteDe(dia))}`
}

// El número del día («10») para la celda de una grilla.
export function numeroDelDia(dia: string): string {
  return String(Number(dia.slice(8, 10)))
}

// `?ver=evento,tarea` → las clases a mostrar. Vacío o ausente = todas; las claves desconocidas se ignoran.
export function leerClases(valor: string | null | undefined): ClaveDeClase[] {
  const claves = CLASES_DE_AGENDA.map((clase) => clase.clave)
  const pedidas = (valor ?? '')
    .split(',')
    .filter((clave): clave is ClaveDeClase => claves.some((conocida) => conocida === clave))
  return pedidas.length > 0 ? claves.filter((clave) => pedidas.includes(clave)) : claves
}
