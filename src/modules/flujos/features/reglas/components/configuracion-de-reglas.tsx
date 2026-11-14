'use client'

import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import type { AmbitoDeFlujo } from '../../../entities/flujo'
import { firmaDeOferta } from '../../../entities/reglas/oferta'
import type {
  CatalogoDeTransporte,
  OfertaDeTransporte as Oferta,
} from '../../../entities/reglas/oferta'
import { useEscrituraDeReglas } from '../hooks/use-escritura-de-reglas'
import { OfertaDeTransporte } from './oferta-de-transporte'
import { ReglasDelFlujo } from './reglas-del-flujo'

type Props = {
  flujoId: string
  claveDelFlujo: string
  ambito: AmbitoDeFlujo
  // `flujos.actualizado_en` tal cual: la versión para la próxima escritura.
  version: string
  reglas: readonly { regla: string; activa: boolean }[]
  // Por qué no se puede cambiar nada (nulo si se puede).
  motivoSinPermiso: string | null
  // Con «Transporte» encendida: lo guardado y lo que se puede marcar.
  transporte: { oferta: Oferta; catalogo: CatalogoDeTransporte } | null
  puedeCargarCatalogos: boolean
}

// Lo que se edita en la pestaña «Reglas»: las reglas y, con «Transporte» encendida, su oferta. Comparten la versión del flujo, el envío a la vez y el
// aviso de conflicto.
export function ConfiguracionDeReglas({
  flujoId,
  claveDelFlujo,
  ambito,
  version,
  reglas,
  motivoSinPermiso,
  transporte,
  puedeCargarCatalogos,
}: Props) {
  const escritura = useEscrituraDeReglas(version)
  const sinPermiso = motivoSinPermiso !== null
  return (
    <div className="grid gap-6">
      {escritura.conflicto !== null ? (
        <AvisoDeConflicto
          mensaje={escritura.conflicto}
          alRecargar={escritura.recargar}
          detalle="No se guardó nada. Recargar trae la versión nueva del flujo."
        />
      ) : null}
      {motivoSinPermiso !== null ? <Aviso tono="info">{motivoSinPermiso}</Aviso> : null}
      <ReglasDelFlujo
        flujoId={flujoId}
        claveDelFlujo={claveDelFlujo}
        ambito={ambito}
        reglas={reglas}
        sinPermiso={sinPermiso}
        escritura={escritura}
      />
      {transporte ? (
        <OfertaDeTransporte
          key={firmaDeOferta(transporte.oferta)}
          flujoId={flujoId}
          oferta={transporte.oferta}
          catalogo={transporte.catalogo}
          sinPermiso={sinPermiso}
          escritura={escritura}
          puedeCargarCatalogos={puedeCargarCatalogos}
        />
      ) : null}
    </div>
  )
}
