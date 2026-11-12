// Bloque «Vehículos trabados»: las demoradas a las que les falta un requisito bloqueante para su fase siguiente, y qué les falta (6.12-2; «Trabado»
// en el GLOSARIO). Lee por la entrada pública de `logistica` (`bandejaLogistica`, la misma lectura que los otros dos bloques de logística). Cada fila
// abre el panel de su unidad. Sin «Ver todas»: la cadena no tiene un filtro de trabados y las demoradas mostrarían unidades que no lo están.
import { bandejaLogistica, detalleDeTrabado } from '@/modules/logistica'
import { cantidadAcotada } from '@/shared/lib/conteo'
import { unidadDeLogistica } from '@/shared/lib/rutas'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { ListaDeBloque } from '../components/lista-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoVehiculosTrabados: CuerpoDeBloque = async ({ bloque }) => {
  const lectura = await bandejaLogistica(TOPE_DE_BLOQUE)
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { filas, hayMas } = lectura.data.trabados
  if (filas.length === 0) {
    return <VacioDeBloque bloque={bloque} />
  }
  return (
    <ListaDeBloque
      filas={filas.map((fila) => ({
        id: fila.id,
        texto: fila.titulo,
        detalle: detalleDeTrabado(fila),
        ruta: unidadDeLogistica(fila.id),
      }))}
      conteo={cantidadAcotada(filas.length + (hayMas ? 1 : 0), TOPE_DE_BLOQUE, {
        singular: 'vehículo trabado',
        plural: 'vehículos trabados',
      })}
    />
  )
}
