// Bloque «Documentos por aprobar»: los documentos de vehículos que alguien subió y esperan revisión, el más viejo arriba (6.12-2; los de repuestos los
// suma 8.05). Lee por la entrada pública de `logistica` (`bandejaLogistica`, la misma lectura que los otros dos bloques de logística). Cada fila abre
// el panel del vehículo, donde se aprueba; «Ver todas» lleva a la cadena filtrada por «por aprobar».
import { CLAVE_DE_POR_APROBAR, bandejaLogistica } from '@/modules/logistica'
import { cantidadAcotada } from '@/shared/lib/conteo'
import { fechaRelativa } from '@/shared/lib/fechas'
import { RUTAS, unidadDeLogistica } from '@/shared/lib/rutas'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { ListaDeBloque } from '../components/lista-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import { VerTodasDelBloque } from '../components/ver-todas-del-bloque'
import type { CuerpoDeBloque } from './tipos'

const RUTA_DE_POR_APROBAR = `${RUTAS.logistica}?${new URLSearchParams({ [CLAVE_DE_POR_APROBAR]: 'si' }).toString()}`

export const CuerpoDocumentosPorAprobar: CuerpoDeBloque = async ({ bloque, zona }) => {
  const lectura = await bandejaLogistica(TOPE_DE_BLOQUE)
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { filas, hayMas } = lectura.data.porAprobar
  if (filas.length === 0) {
    return <VacioDeBloque bloque={bloque} />
  }
  const ahora = new Date()
  return (
    <>
      <ListaDeBloque
        filas={filas.map((fila) => ({
          id: fila.id,
          texto: fila.titulo,
          detalle: `${fila.tipo} · subido ${fechaRelativa(fila.creadoEn, { zona, ahora })}`,
          ruta: unidadDeLogistica(fila.vehiculoId),
        }))}
        conteo={cantidadAcotada(filas.length + (hayMas ? 1 : 0), TOPE_DE_BLOQUE, {
          singular: 'documento por aprobar',
          plural: 'documentos por aprobar',
        })}
      />
      <VerTodasDelBloque ruta={RUTA_DE_POR_APROBAR} />
    </>
  )
}
