import type { Metadata } from 'next'
import { connection } from 'next/server'
import {
  leerAgenda,
  leerClases,
  leerEvento,
  leerFecha,
  leerIdDeUrl,
  leerTarea,
  leerVista,
  puedeCompletarTarea,
  puedeDarTareaAOtro,
  puedeEditarEvento,
  puedeEditarTarea,
  puedeReasignarTarea,
  rangoDe,
  type DetalleDeEvento,
  type DetalleDeTarea,
} from '@/modules/agenda'
import { CalendarioDeAgenda, PanelesDeAgenda } from '@/modules/agenda/pantallas/agenda'
import { leerAjustes } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import { anchoDeEstaPeticion } from '@/shared/lib/ancho.server'
import { datosO } from '@/shared/lib/errores'
import { diaEnZona, ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'

export const metadata: Metadata = { title: 'Agenda' }

type Detalles = { evento: DetalleDeEvento | null; tarea: DetalleDeTarea | null }

// Lo que cada panel necesita saber de quien mira: qué botones se dibujan (la base lo vuelve a exigir).
function eventoPedido(
  id: string | null,
  detalle: Detalles['evento'],
  yo: string,
  permisos: Permisos,
) {
  return id
    ? {
        id,
        detalle,
        puedeEditar:
          detalle !== null && puedeEditarEvento({ ...detalle, eliminado: false }, yo, permisos),
      }
    : null
}

function tareaPedida(
  id: string | null,
  detalle: Detalles['tarea'],
  yo: string,
  permisos: Permisos,
) {
  return id
    ? {
        id,
        detalle,
        puedeEditar: detalle !== null && puedeEditarTarea(detalle, yo),
        puedeCompletar: detalle !== null && puedeCompletarTarea(detalle, yo),
        puedeReasignar: detalle !== null && puedeReasignarTarea(detalle, yo, permisos),
      }
    : null
}

// La agenda: mes, semana o día, en la zona de la empresa. Lo que se ve lo decide la base con la sesión de quien mira (`agenda_rango`, de invocador);
// la vista, la fecha, las clases y «la de todos» viven en la URL. El celular abre en «día» y el escritorio en «mes».
export default async function PaginaDeAgenda({ searchParams }: PageProps<'/agenda'>) {
  // La sesión, los ajustes y el ancho se leen al pedir la pantalla, no al prepararla.
  await connection()
  const [sesion, ajustes, parametros, ancho] = await Promise.all([
    requerirSesion(),
    leerAjustes(),
    searchParams,
    anchoDeEstaPeticion(),
  ])
  const zona = ajustes.ok ? ajustes.data.ajustes.zonaHoraria : ZONA_POR_DEFECTO
  const hoy = diaEnZona(new Date().toISOString(), { zona })
  const vista = leerVista(
    unParametro(parametros['vista']),
    ancho < CORTE_DE_LA_TABLA ? 'dia' : 'mes',
  )
  const fecha = leerFecha(unParametro(parametros['fecha']), hoy)
  const clases = leerClases(unParametro(parametros['ver']))
  // `?de=todos` sin `agenda.ver_todo` se ignora (la base lo rechazaría): ver la de todos es un filtro de lectura, no una acción.
  const puedeVerTodo = puede(sesion.permisos, 'agenda.ver_todo')
  const deTodos = puedeVerTodo && unParametro(parametros['de']) === 'todos'
  // `?evento=` y `?tarea=` abren su panel: el detalle se lee por id en la misma ronda que el calendario, y sólo si la URL lo pide.
  const yo = sesion.usuarioId
  const eventoId = leerIdDeUrl(unParametro(parametros['evento']))
  const tareaId = leerIdDeUrl(unParametro(parametros['tarea']))
  const [lectura, lecturaDeEvento, lecturaDeTarea] = await Promise.all([
    leerAgenda({ ...rangoDe(vista, fecha, zona), deTodos }),
    eventoId ? leerEvento(eventoId, yo) : null,
    tareaId ? leerTarea(tareaId) : null,
  ])
  const agenda = datosO(lectura)
  const detalleDeEvento = lecturaDeEvento ? datosO(lecturaDeEvento) : null
  const detalleDeTarea = lecturaDeTarea ? datosO(lecturaDeTarea) : null
  return (
    <>
      <CalendarioDeAgenda
        agenda={agenda}
        vista={vista}
        fecha={fecha}
        hoy={hoy}
        zona={zona}
        clases={clases}
        puedeVerTodo={puedeVerTodo}
        deTodos={deTodos}
      />
      <PanelesDeAgenda
        evento={eventoPedido(eventoId, detalleDeEvento, yo, sesion.permisos)}
        tarea={tareaPedida(tareaId, detalleDeTarea, yo, sesion.permisos)}
        puedePublicar={puede(sesion.permisos, 'agenda.eventos.publicar')}
        puedeAsignar={puedeDarTareaAOtro(sesion.permisos)}
        zona={zona}
        hoy={hoy}
        fecha={fecha}
      />
    </>
  )
}
