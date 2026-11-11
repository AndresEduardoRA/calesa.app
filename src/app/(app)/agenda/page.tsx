import type { Metadata } from 'next'
import { connection } from 'next/server'
import { leerAgenda, leerClases, leerFecha, leerVista, rangoDe } from '@/modules/agenda'
import { CalendarioDeAgenda } from '@/modules/agenda/pantallas/agenda'
import { leerAjustes } from '@/modules/empresa'
import { requerirSesion } from '@/modules/equipo'
import { CORTE_DE_LA_TABLA } from '@/shared/lib/ancho'
import { anchoDeEstaPeticion } from '@/shared/lib/ancho.server'
import { datosO } from '@/shared/lib/errores'
import { diaEnZona, ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { puede } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'

export const metadata: Metadata = { title: 'Agenda' }

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
  const agenda = datosO(await leerAgenda({ ...rangoDe(vista, fecha, zona), deTodos }))
  return (
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
  )
}
