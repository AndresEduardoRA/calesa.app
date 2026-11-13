// Bloque «Repuestos por mover»: los ítems del flujo de repuestos en una fase que no es la final, el que lleva más tiempo en su fase arriba (8.13-4). Lee por la
// entrada pública de `repuestos`. Cada fila abre el panel del ítem, donde «Qué falta» y los botones dicen si se puede mover; «Ver todas» lleva a la cadena.
import {
  detalleDeRepuestoPorMover,
  leerRepuestosPorMover,
  rutaDeLaCadena,
  rutaDelItemDeInicio,
  textoDeRepuestoPorMover,
} from '@/modules/repuestos'
import { cantidadAcotada } from '@/shared/lib/conteo'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { ListaDeBloque } from '../components/lista-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import { VerTodasDelBloque } from '../components/ver-todas-del-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoRepuestosPorMover: CuerpoDeBloque = async ({ bloque, zona }) => {
  const lectura = await leerRepuestosPorMover(TOPE_DE_BLOQUE)
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { filas, hayMas } = lectura.data
  if (filas.length === 0) {
    return <VacioDeBloque bloque={bloque} />
  }
  const ahora = new Date()
  return (
    <>
      <ListaDeBloque
        filas={filas.map((fila) => ({
          id: fila.id,
          texto: textoDeRepuestoPorMover(fila),
          detalle: detalleDeRepuestoPorMover(fila, { zona, ahora }),
          ruta: rutaDelItemDeInicio(fila),
        }))}
        conteo={cantidadAcotada(filas.length + (hayMas ? 1 : 0), TOPE_DE_BLOQUE, {
          singular: 'repuesto por mover',
          plural: 'repuestos por mover',
        })}
      />
      <VerTodasDelBloque ruta={rutaDeLaCadena()} />
    </>
  )
}
