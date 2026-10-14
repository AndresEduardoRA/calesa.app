import { ImageIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { EstadoVacio } from '@/shared/ui/estados'
import { MAXIMO_DE_FOTOS, type Galeria } from '../../../entities/foto'
import type { FotoDeSubasta } from '../../../entities/subasta-fotos'
import { BotonTraerFotos } from '../../subasta/components/boton-traer-fotos'
import { GaleriaDeFotos } from './galeria-de-fotos'
import { SubidaDeFotos } from './subida-de-fotos'

type Props = {
  vehiculoId: string
  galeria: Galeria
  // Si quien mira puede cambiar las fotos de este vehículo (lo decide la base).
  puedeEditar: boolean
  // Las fotos de su subasta que apibara trajo y todavía no están acá. Sólo si apibara está encendida
  // y puede editar: si no, no se ofrece.
  deSubasta?: { origenId: string; fotas: readonly FotoDeSubasta[] }
}

const SIN_PERMISO = 'No tienes permiso para cambiar las fotos de este vehículo.'

// La pestaña «Fotos» de un vehículo. Quien no puede editarlo las ve igual, sin controles y con
// el motivo; quien puede, las sube, elige la portada, las ordena y las elimina.
export function SeccionDeFotos({ vehiculoId, galeria, puedeEditar, deSubasta }: Props) {
  const sinFotos = galeria.fotos.length === 0
  return (
    <section aria-label="Fotos" className="grid gap-4">
      {puedeEditar ? <SubidaDeFotos vehiculoId={vehiculoId} fotos={galeria.fotos} /> : null}
      {puedeEditar && deSubasta && deSubasta.fotas.length > 0 ? (
        <Aviso>
          <p>
            Faltan fotos de la subasta: apibara trae {deSubasta.fotas.length} más de las que hay
            acá.
          </p>
          <div className="mt-2">
            <BotonTraerFotos
              vehiculoId={vehiculoId}
              origenId={deSubasta.origenId}
              fotas={deSubasta.fotas}
              sinFotos={sinFotos}
            />
          </div>
        </Aviso>
      ) : null}
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
