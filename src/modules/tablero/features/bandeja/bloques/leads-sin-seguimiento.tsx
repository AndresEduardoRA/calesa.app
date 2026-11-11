// Bloque «Leads sin seguimiento»: los míos (mi cartera) sin ningún seguimiento y creados hace más de 24 h. No hay un filtro así en
// el listado de leads, así que no se inventa uno: cada fila lleva a su ficha.
import { creadoAntesDe, leerLeadsSinSeguimiento, rutaDeSeguimientos } from '@/modules/leads'
import { cantidadAcotada } from '@/shared/lib/conteo'
import { fechaRelativa } from '@/shared/lib/fechas'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { ListaDeBloque } from '../components/lista-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoLeadsSinSeguimiento: CuerpoDeBloque = async ({ bloque, zona }) => {
  const ahora = new Date()
  const lectura = await leerLeadsSinSeguimiento({
    creadosAntesDe: creadoAntesDe(ahora.toISOString()),
    tope: TOPE_DE_BLOQUE,
  })
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { filas, hayMas } = lectura.data
  if (filas.length === 0) {
    return <VacioDeBloque bloque={bloque} />
  }
  return (
    <ListaDeBloque
      filas={filas.map((lead) => ({
        id: lead.id,
        texto: lead.nombre,
        detalle: `Creado ${fechaRelativa(lead.creadoEn, { zona, ahora })}`,
        ruta: rutaDeSeguimientos(lead.id),
      }))}
      conteo={cantidadAcotada(filas.length + (hayMas ? 1 : 0), TOPE_DE_BLOQUE, {
        singular: 'lead sin seguimiento',
        plural: 'leads sin seguimiento',
      })}
    />
  )
}
