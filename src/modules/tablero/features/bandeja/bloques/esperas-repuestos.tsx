// Bloque «Esperas que destraban vehículos»: los repuestos en vuelo de proyectos que tienen un vehículo, de los que ese vehículo puede depender (8.13-4). Lee por la
// entrada pública de `repuestos`. Cada fila nombra al vehículo y abre el panel del ítem; «Ver todas» lleva a la cadena. Sin el cruce exacto con la espera de la fase
// del vehículo (abierto 8-13a): la fila dice qué ítem está en camino, no que el vehículo lo espere hoy.
import {
  detalleDeEsperaDeInicio,
  leerEsperasDeInicio,
  rutaDeLaCadena,
  rutaDelItemDeInicio,
  textoDeEsperaDeInicio,
} from '@/modules/repuestos'
import { cantidadAcotada } from '@/shared/lib/conteo'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { ListaDeBloque } from '../components/lista-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import { VerTodasDelBloque } from '../components/ver-todas-del-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoEsperasRepuestos: CuerpoDeBloque = async ({ bloque }) => {
  const lectura = await leerEsperasDeInicio(TOPE_DE_BLOQUE)
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { filas, hayMas } = lectura.data
  if (filas.length === 0) {
    return <VacioDeBloque bloque={bloque} />
  }
  return (
    <>
      <ListaDeBloque
        filas={filas.map((fila) => ({
          id: fila.id,
          texto: textoDeEsperaDeInicio(fila),
          detalle: detalleDeEsperaDeInicio(fila),
          ruta: rutaDelItemDeInicio(fila),
        }))}
        conteo={cantidadAcotada(filas.length + (hayMas ? 1 : 0), TOPE_DE_BLOQUE, {
          singular: 'repuesto en espera',
          plural: 'repuestos en espera',
        })}
      />
      <VerTodasDelBloque ruta={rutaDeLaCadena()} />
    </>
  )
}
