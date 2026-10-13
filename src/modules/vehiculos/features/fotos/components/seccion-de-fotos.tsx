import { ImageIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { EstadoVacio } from '@/shared/ui/estados'
import { MAXIMO_DE_FOTOS, type Galeria } from '../../../entities/foto'
import { GaleriaDeFotos } from './galeria-de-fotos'
import { SubidaDeFotos } from './subida-de-fotos'

type Props = {
  vehiculoId: string
  galeria: Galeria
  // Si quien mira puede cambiar las fotos de este vehículo (lo decide la base).
  puedeEditar: boolean
}

const SIN_PERMISO = 'No tienes permiso para cambiar las fotos de este vehículo.'

// La pestaña «Fotos» de un vehículo. Quien no puede editarlo las ve igual, sin controles y con
// el motivo; quien puede, las sube, elige la portada, las ordena y las elimina.
export function SeccionDeFotos({ vehiculoId, galeria, puedeEditar }: Props) {
  const sinFotos = galeria.fotos.length === 0
  return (
    <section aria-label="Fotos" className="grid gap-4">
      {puedeEditar ? <SubidaDeFotos vehiculoId={vehiculoId} fotos={galeria.fotos} /> : null}
      {!puedeEditar && !sinFotos ? <Aviso>{SIN_PERMISO}</Aviso> : null}
      {sinFotos ? (
        <EstadoVacio
          Icono={ImageIcon}
          titulo="Este vehículo no tiene fotos"
          descripcion={
            puedeEditar
              ? `Súbelas con «Elegir fotos», hasta ${MAXIMO_DE_FOTOS}. La primera queda de portada y es la que se ve en el inventario.`
              : SIN_PERMISO
          }
        />
      ) : (
        <GaleriaDeFotos vehiculoId={vehiculoId} galeria={galeria} puedeEditar={puedeEditar} />
      )}
    </section>
  )
}
