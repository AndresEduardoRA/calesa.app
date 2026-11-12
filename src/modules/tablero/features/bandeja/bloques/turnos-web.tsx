// Bloque «Turnos de la web sin confirmar» (8.05-1): mis turnos `asignada` y `vencida`, el que vence primero arriba. Lee por la entrada pública de `web`
// (`leerMisTurnos`, sólo los míos aunque quien mira gestione la cola) y dibuja una `<TarjetaTurno>` por turno, con «Contacté» y «Vincular a lead».
// Inicio no es en tiempo real: al volver a la pestaña se relee (`<ActualizarAlVolver>`); la campana llega en la Fase 7.
import { leerMisTurnos } from '@/modules/web'
import { ActualizarAlVolver, TarjetaTurno } from '@/modules/web/client'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoTurnosWeb: CuerpoDeBloque = async ({ bloque }) => {
  const lectura = await leerMisTurnos({ tope: TOPE_DE_BLOQUE })
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { filas, hayMas } = lectura.data
  if (filas.length === 0) {
    return (
      <>
        <VacioDeBloque bloque={bloque} />
        <ActualizarAlVolver />
      </>
    )
  }
  const ahora = new Date().toISOString()
  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-[minmax(0,1fr)] divide-y divide-(--color-line)">
        {filas.map((turno) => (
          <li key={turno.id}>
            <TarjetaTurno turno={turno} ahora={ahora} />
          </li>
        ))}
      </ul>
      {hayMas ? (
        <div className="px-4 pb-2">
          <AvisoDeTope
            texto={`Tienes más de ${TOPE_DE_BLOQUE} turnos sin confirmar. Aparecen de a ${TOPE_DE_BLOQUE}, los que vencen primero.`}
            camino="Confirma los de arriba para ver los siguientes."
          />
        </div>
      ) : null}
      <ActualizarAlVolver />
    </div>
  )
}
