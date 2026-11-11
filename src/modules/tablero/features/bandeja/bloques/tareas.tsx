// Bloque «Mis tareas»: mis tareas pendientes, las que vencen primero arriba y las sin fecha al final; una vencida dice «Vencida». Lee por la entrada pública de
// `agenda`, con su RLS. Cada fila abre su panel en `/agenda`; «Ver todas» lleva al calendario de tareas.
import { estaVencida, leerMisTareas } from '@/modules/agenda'
import { cantidadAcotada } from '@/shared/lib/conteo'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { ListaDeBloque } from '../components/lista-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import { VerTodasDelBloque } from '../components/ver-todas-del-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoTareas: CuerpoDeBloque = async ({ bloque, zona }) => {
  const lectura = await leerMisTareas({ tope: TOPE_DE_BLOQUE })
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { filas, hayMas } = lectura.data
  if (filas.length === 0) {
    return <VacioDeBloque bloque={bloque} />
  }
  const ahora = new Date().toISOString()
  return (
    <>
      <ListaDeBloque
        filas={filas.map((fila) => ({
          id: fila.id,
          texto: fila.titulo,
          detalle: fila.venceEn
            ? `${estaVencida(fila.venceEn, ahora) ? 'Vencida' : 'Vence'} · ${formatearFechaHora(fila.venceEn, { zona })}`
            : 'Sin fecha',
          ruta: `/agenda?tarea=${fila.id}`,
        }))}
        conteo={cantidadAcotada(filas.length + (hayMas ? 1 : 0), TOPE_DE_BLOQUE, {
          singular: 'tarea',
          plural: 'tareas',
        })}
      />
      <VerTodasDelBloque ruta="/agenda?ver=tarea" />
    </>
  )
}
