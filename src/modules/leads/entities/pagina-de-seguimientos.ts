// La línea de tiempo de un lead cuando crece (9d-2): lo cargado es una ventana de la lista, más
// recientes primero, que empieza en lo más nuevo o en una fecha («Ir a una fecha») y termina donde
// llegó «Ver más». Lo que vuelve de una RPC se pone sólo si cae dentro de esa ventana: ponerlo fuera
// correría el cursor y «Ver más» saltearía filas. Lo cargado tiene tope (`enElTope()` de `shared`).
import { inicioDelDia, diaSiguiente } from '@/shared/lib/fechas'
import { conSeguimiento, type Seguimiento } from './seguimiento'

// Lo cargado: la lista, si hay más hacia atrás y desde qué día empieza (null = desde lo más nuevo).
export type VentanaDeSeguimientos = {
  lista: readonly Seguimiento[]
  hayMas: boolean
  desde: string | null
}

// El id más alto: con él, el cursor de un día incluye todo ese día.
const ID_MAXIMO = 'ffffffff-ffff-ffff-ffff-ffffffffffff'

// Más recientes primero, como los entrega la base (`ocurrido_en desc, id desc`): negativo si `a` va
// antes que `b`.
function orden(a: Seguimiento, b: Seguimiento): number {
  if (a.ocurridoEn !== b.ocurridoEn) {
    return Date.parse(b.ocurridoEn) - Date.parse(a.ocurridoEn)
  }
  return b.id < a.id ? -1 : b.id > a.id ? 1 : 0
}

// ¿Cae dentro de la ventana? Abajo, hasta el último cargado (si no hay más, todo); arriba, desde el
// primero si la ventana empieza en una fecha (si empieza en lo más nuevo, todo).
function dentroDeLaVentana(ventana: VentanaDeSeguimientos, uno: Seguimiento): boolean {
  const primero = ventana.lista.at(0)
  const ultimo = ventana.lista.at(-1)
  const abajo = !ventana.hayMas || (ultimo !== undefined && orden(uno, ultimo) <= 0)
  const arriba = ventana.desde === null || (primero !== undefined && orden(uno, primero) >= 0)
  return abajo && arriba
}

// Pone (o reemplaza) uno en la ventana, en su lugar; uno eliminado o que cae fuera sale (vuelve con
// «Ver más», en su versión de ese momento).
export function ponerEnLaVentana(ventana: VentanaDeSeguimientos, uno: Seguimiento): Seguimiento[] {
  const sin = ventana.lista.filter((s) => s.id !== uno.id)
  if (uno.eliminado || !dentroDeLaVentana({ ...ventana, lista: sin }, uno)) {
    return sin
  }
  return conSeguimiento(sin, uno)
}

// Lo que se anotó, editó o eliminó mientras se releía, sobre lo que llegó: así no vuelve a su versión
// vieja (la regla de la 9d) y lo que cae fuera de la ventana nueva no la deforma.
export function conLoPuestoMientras(
  ventana: VentanaDeSeguimientos,
  puestos: readonly Seguimiento[],
): Seguimiento[] {
  return puestos.reduce<Seguimiento[]>(
    (lista, uno) => ponerEnLaVentana({ ...ventana, lista }, uno),
    [...ventana.lista],
  )
}

// El cursor de «Ir a una fecha»: todo lo de ese día (en la zona de la empresa) y lo anterior. Sin RPC
// nueva: es el mismo cursor de «Ver más», sembrado con el inicio del día siguiente y el id más alto.
export function cursorDeUnaFecha(
  dia: string,
  zona: string,
): { antesEn: string; antesId: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || Number.isNaN(Date.parse(`${dia}T00:00:00Z`))) {
    return null
  }
  return { antesEn: inicioDelDia(diaSiguiente(dia), { zona }), antesId: ID_MAXIMO }
}
