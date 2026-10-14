// Las fechas cruzan servidor → cliente como string ISO y se muestran en la zona horaria de la
// empresa, no en la del navegador ni en la del servidor. Nunca un `Date` en props.
import { es } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export const ZONA_POR_DEFECTO = 'America/La_Paz'

type Opciones = { zona?: string }
type OpcionesRelativa = Opciones & { ahora?: Date }

// Una fecha sin hora (`2026-10-11`, columnas `date`) es un día del calendario de la empresa:
// se ancla a su medianoche para que ninguna zona la corra al día anterior.
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/

function aInstante(iso: string, zona: string): Date {
  return SOLO_FECHA.test(iso) ? fromZonedTime(`${iso}T00:00:00`, zona) : new Date(iso)
}

function formatear(iso: string, patron: string, zona: string): string {
  return formatInTimeZone(aInstante(iso, zona), zona, patron, { locale: es })
}

// «11 oct 2026»
export function formatearFecha(iso: string, { zona = ZONA_POR_DEFECTO }: Opciones = {}): string {
  return formatear(iso, 'd MMM yyyy', zona)
}

// «11 oct 2026, 14:30»
export function formatearFechaHora(
  iso: string,
  { zona = ZONA_POR_DEFECTO }: Opciones = {},
): string {
  return formatear(iso, 'd MMM yyyy, HH:mm', zona)
}

// «14:30»
export function formatearHora(iso: string, { zona = ZONA_POR_DEFECTO }: Opciones = {}): string {
  return formatear(iso, 'HH:mm', zona)
}

// El día del calendario de la empresa en que cae un instante, como `YYYY-MM-DD`.
// Sirve para agrupar por día y para saber qué es «hoy».
export function diaEnZona(iso: string, { zona = ZONA_POR_DEFECTO }: Opciones = {}): string {
  return formatear(iso, 'yyyy-MM-dd', zona)
}

const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

const SEGUNDOS_AHORA = 45
const DIAS_RELATIVOS = 6
const MS_POR_DIA = 86_400_000

// Días de calendario (en la zona de la empresa) entre dos instantes. `YYYY-MM-DD` se interpreta
// como medianoche UTC en ambos lados, así que la resta es exacta y no depende del huso del proceso.
function diasDeCalendario(desde: Date, hasta: Date, zona: string): number {
  const dia = (instante: Date) => Date.parse(diaEnZona(instante.toISOString(), { zona }))
  return Math.round((dia(hasta) - dia(desde)) / MS_POR_DIA)
}

function relativaPorDias(iso: string, instante: Date, ahora: Date, zona: string): string {
  const dias = diasDeCalendario(ahora, instante, zona)
  return Math.abs(dias) <= DIAS_RELATIVOS
    ? relativo.format(dias, 'day')
    : formatearFecha(iso, { zona })
}

// Reciente → relativa («hace 5 minutos», «ayer», «mañana»); más lejos → la fecha absoluta.
// Los días se cuentan por calendario de la empresa, no por bloques de 24 h. Una fecha sin hora
// sólo se expresa en días («hoy», «mañana»): no tiene minutos que contar.
export function fechaRelativa(iso: string, opciones: OpcionesRelativa = {}): string {
  const { zona = ZONA_POR_DEFECTO, ahora = new Date() } = opciones
  const instante = aInstante(iso, zona)
  if (SOLO_FECHA.test(iso)) {
    return relativaPorDias(iso, instante, ahora, zona)
  }

  const segundos = Math.round((instante.getTime() - ahora.getTime()) / 1000)
  if (Math.abs(segundos) < SEGUNDOS_AHORA) {
    return 'ahora'
  }
  const minutos = Math.trunc(segundos / 60)
  if (Math.abs(minutos) < 60) {
    return relativo.format(minutos || Math.sign(segundos), 'minute')
  }
  const horas = Math.trunc(minutos / 60)
  if (Math.abs(horas) < 24) {
    return relativo.format(horas, 'hour')
  }
  return relativaPorDias(iso, instante, ahora, zona)
}

// El día que sigue a un `YYYY-MM-DD`, también como `YYYY-MM-DD`. Sirve para «hasta ese día
// inclusive» escrito como «antes del día siguiente».
export function diaSiguiente(dia: string): string {
  const instante = new Date(`${dia}T00:00:00Z`)
  instante.setUTCDate(instante.getUTCDate() + 1)
  return instante.toISOString().slice(0, 10)
}

// `YYYY-MM-DD` más o menos N días, también como `YYYY-MM-DD`. Aritmética de calendario: no
// depende de la zona del proceso.
export function sumarDias(dia: string, dias: number): string {
  const instante = new Date(`${dia}T00:00:00Z`)
  instante.setUTCDate(instante.getUTCDate() + dias)
  return instante.toISOString().slice(0, 10)
}

// «15/10»: el día y el mes de un `YYYY-MM-DD`. Un día del calendario no lleva zona: no se
// convierte. Lo que no es una fecha así vuelve vacío.
export function formatearDiaYMes(dia: string): string {
  if (!SOLO_FECHA.test(dia)) {
    return ''
  }
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
}

// El instante (ISO, en UTC) en que empieza un día del calendario de la empresa. Con esto un
// filtro «desde el 13» sobre una fecha con hora empieza a la medianoche de la empresa, no de UTC.
export function inicioDelDia(dia: string, { zona = ZONA_POR_DEFECTO }: Opciones = {}): string {
  return fromZonedTime(`${dia}T00:00:00`, zona).toISOString()
}

const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

// Un `<input type="datetime-local">` entrega «2026-10-13T14:30» sin zona: es la hora de la
// empresa. Esto la lleva al instante (ISO, en UTC) que se guarda; null si no es una fecha.
export function instanteDeLocal(local: string, { zona = ZONA_POR_DEFECTO }: Opciones = {}) {
  if (!LOCAL.test(local)) {
    return null
  }
  const instante = fromZonedTime(`${local}:00`, zona)
  return Number.isNaN(instante.getTime()) ? null : instante.toISOString()
}

// El camino de vuelta: un instante guardado, como lo espera el `datetime-local` (hora de la
// empresa). Lo que no es un instante vuelve vacío.
export function localDeInstante(iso: string, { zona = ZONA_POR_DEFECTO }: Opciones = {}): string {
  return Number.isNaN(Date.parse(iso)) ? '' : formatear(iso, "yyyy-MM-dd'T'HH:mm", zona)
}
