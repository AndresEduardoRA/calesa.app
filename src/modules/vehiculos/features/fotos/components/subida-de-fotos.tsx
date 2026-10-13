'use client'

import { useMemo } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { ZonaDeArchivos } from '@/shared/ui/zona-de-archivos'
import { MAXIMO_DE_FOTOS, lugarPara, type Foto } from '../../../entities/foto'
import { contarBandeja, paraSubir, verBandeja } from '../bandeja'
import { useBandejaDeFotos } from '../hooks/use-bandeja-de-fotos'
import { useSubidaDeFotos } from '../hooks/use-subida-de-fotos'
import { BandejaDeSubida } from './bandeja-de-subida'

type Props = { vehiculoId: string; fotos: readonly Foto[] }

// Sumar fotos: elegirlas (selector, soltarlas o, en el celular, la cámara), verlas y recién
// entonces subirlas. El tope y las repetidas se dicen antes de subir.
export function SubidaDeFotos({ vehiculoId, fotos }: Props) {
  const { bandeja, despachar, elegir } = useBandejaDeFotos()
  const subida = useSubidaDeFotos(vehiculoId, despachar)
  const enLinea = useEnLinea()
  const existentes = useMemo(() => new Set(fotos.map((foto) => foto.hash)), [fotos])
  const lugar = lugarPara(fotos)
  const vistos = verBandeja(bandeja, existentes, lugar)
  const lleno = lugar === 0
  return (
    <div className="grid gap-3">
      <ZonaDeArchivos
        // Con `image/*`, un iPhone entrega sus HEIC ya convertidos a JPEG.
        aceptar="image/*"
        alElegir={elegir}
        etiquetaDeElegir="Elegir fotos"
        etiquetaDeCamara="Tomar una foto"
        deshabilitada={subida.enCurso || lleno}
        ayuda={
          lleno
            ? `Este vehículo ya tiene ${MAXIMO_DE_FOTOS} fotos. Elimina alguna para subir otra.`
            : `O suéltalas acá. Hasta ${MAXIMO_DE_FOTOS} por vehículo; se suben recién cuando confirmas.`
        }
      />
      {enLinea || vistos.length === 0 ? null : (
        <Aviso tono="aviso">
          No hay conexión. Lo que elegiste sigue acá: súbelo cuando vuelva.
        </Aviso>
      )}
      {vistos.length > 0 ? (
        <BandejaDeSubida
          vistos={vistos}
          conteo={contarBandeja(vistos)}
          tiene={fotos.length}
          progreso={subida.progreso}
          alSubir={() => {
            void subida.subir(paraSubir(vistos))
          }}
          alQuitar={(clave) => {
            despachar({ tipo: 'quitada', clave })
          }}
          alVaciar={() => {
            despachar({ tipo: 'vaciada' })
          }}
        />
      ) : null}
    </div>
  )
}
