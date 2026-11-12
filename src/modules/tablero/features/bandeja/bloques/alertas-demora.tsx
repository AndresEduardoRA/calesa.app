// Bloque «Alertas por demora»: las unidades que llevan más días de lo esperado en su fase, la más pasada de su límite arriba (6.12-2). Lee por la
// entrada pública de `logistica` (`bandejaLogistica`, una lectura por request para los tres bloques de logística). Cada fila abre el panel de su
// unidad; «Ver todas» lleva a la cadena filtrada por demoradas en el origen de la primera fila (sin él la cadena abre la primera pestaña).
import {
  CLAVE_DE_DEMORADAS,
  CLAVE_DE_ORIGEN_DE_LA_CADENA,
  bandejaLogistica,
  detalleDeDemorada,
} from '@/modules/logistica'
import { cantidadAcotada } from '@/shared/lib/conteo'
import { RUTAS, unidadDeLogistica } from '@/shared/lib/rutas'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { ListaDeBloque } from '../components/lista-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import { VerTodasDelBloque } from '../components/ver-todas-del-bloque'
import type { CuerpoDeBloque } from './tipos'

function rutaDeLasDemoradas(origenId: string): string {
  const parametros = new URLSearchParams({
    [CLAVE_DE_ORIGEN_DE_LA_CADENA]: origenId,
    [CLAVE_DE_DEMORADAS]: 'si',
  })
  return `${RUTAS.logistica}?${parametros.toString()}`
}

export const CuerpoAlertasDemora: CuerpoDeBloque = async ({ bloque }) => {
  const lectura = await bandejaLogistica(TOPE_DE_BLOQUE)
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { filas, hayMas } = lectura.data.demoradas
  const primera = filas[0]
  if (!primera) {
    return <VacioDeBloque bloque={bloque} />
  }
  const ahora = new Date()
  return (
    <>
      <ListaDeBloque
        filas={filas.map((fila) => ({
          id: fila.id,
          texto: fila.titulo,
          detalle: detalleDeDemorada(fila, ahora),
          ruta: unidadDeLogistica(fila.id),
        }))}
        conteo={cantidadAcotada(filas.length + (hayMas ? 1 : 0), TOPE_DE_BLOQUE, {
          singular: 'unidad demorada',
          plural: 'unidades demoradas',
        })}
      />
      <VerTodasDelBloque ruta={rutaDeLasDemoradas(primera.origenId)} />
    </>
  )
}
