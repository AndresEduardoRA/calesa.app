// Bloque «Recordatorios de hoy»: mis pendientes con hora hasta el fin del día de la empresa; uno de un día anterior que sigue
// sin completarse se marca «Vencido». Lee por la entrada pública de `leads`, con su RLS. «Ver todas» lleva a la agenda con sólo recordatorios.
import { leerRecordatoriosDeHoy, finDeHoy, rutaDeSeguimientos } from '@/modules/leads'
import { cantidadAcotada } from '@/shared/lib/conteo'
import { diaEnZona, formatearFechaHora, formatearHora } from '@/shared/lib/fechas'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { ListaDeBloque } from '../components/lista-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import { VerTodasDelBloque } from '../components/ver-todas-del-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoRecordatorios: CuerpoDeBloque = async ({ bloque, zona }) => {
  const ahora = new Date().toISOString()
  const lectura = await leerRecordatoriosDeHoy({
    hasta: finDeHoy(ahora, zona),
    tope: TOPE_DE_BLOQUE,
  })
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { filas, hayMas } = lectura.data
  if (filas.length === 0) {
    return <VacioDeBloque bloque={bloque} />
  }
  const hoy = diaEnZona(ahora, { zona })
  return (
    <>
      <ListaDeBloque
        filas={filas.map((fila) => ({
          id: fila.id,
          texto: fila.titulo,
          detalle:
            diaEnZona(fila.recordarEn, { zona }) < hoy
              ? `Vencido · ${formatearFechaHora(fila.recordarEn, { zona })}`
              : formatearHora(fila.recordarEn, { zona }),
          ruta: fila.leadId ? rutaDeSeguimientos(fila.leadId) : null,
        }))}
        conteo={cantidadAcotada(filas.length + (hayMas ? 1 : 0), TOPE_DE_BLOQUE, {
          singular: 'recordatorio',
          plural: 'recordatorios',
        })}
      />
      <VerTodasDelBloque ruta="/agenda?ver=recordatorio" />
    </>
  )
}
