'use client'

import type { ConteoAcotado } from '@/shared/lib/conteo'
import { Aviso } from '@/shared/ui/aviso'
import { Bloque } from '@/shared/ui/bloque'
import { Interruptor } from '@/shared/ui/interruptor'
import { configDeApibara, puedeActivarse, type Integracion } from '../../../entities/integraciones'
import { MOTIVO_SIN_PERMISO_AJUSTES, MOTIVO_SIN_SECRETO } from '../../../entities/motivos'
import { useApibara } from '../hooks/use-apibara'
import { CampoSecreto } from './campo-secreto'
import { ConfigApibara } from './config-apibara'
import { UsoDeApibara } from './uso-de-apibara'
import { WebPublica } from './web-publica'

type Props = {
  // La fila de apibara. Sus tres ediciones tocan la misma fila: la versión llega por props, y
  // cada parte lleva de `key` lo suyo, para que guardar una no borre lo tipeado en otra.
  apibara: Integracion
  // La fila de la web pública, si la instalación la tiene, y cuántos vehículos cambian al
  // encenderla o apagarla (sólo para quien puede editar).
  webPublica?: Integracion | undefined
  vehiculosQueCambian: ConteoAcotado | null
  puedeEditar: boolean
}

// La pestaña «Integraciones»: apibara (su interruptor, su configuración no secreta y su clave) y
// la web pública. Los secretos van a Vault y no se vuelven a mostrar.
export function Integraciones({ apibara, webPublica, vehiculosQueCambian, puedeEditar }: Props) {
  const ediciones = useApibara(apibara.actualizadoEn)
  const sinClave = !puedeActivarse(apibara)
  const config = configDeApibara(apibara.config)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {puedeEditar ? null : <Aviso>{MOTIVO_SIN_PERMISO_AJUSTES}</Aviso>}
      <Bloque
        titulo="apibara"
        descripcion="Trae la ficha y las fotos de un vehículo de subasta a partir de su enlace o su lote."
      >
        <Interruptor
          titulo="Activa"
          ayuda={
            sinClave && !apibara.activa
              ? MOTIVO_SIN_SECRETO
              : 'Con la integración activa, un vehículo de subasta se puede dar de alta pegando su enlace.'
          }
          valor={apibara.activa}
          alCambiar={(activa) => void ediciones.cambiarEstado(activa)}
          deshabilitado={!puedeEditar || ediciones.enCurso || (sinClave && !apibara.activa)}
        />
        <CampoSecreto
          // Al guardarse la clave, el campo vuelve a nacer vacío y cerrado.
          key={apibara.secretoGuardadoEn ?? 'sin-clave'}
          clave="apibara"
          guardadoEn={apibara.secretoGuardadoEn}
          puedeEditar={puedeEditar}
          guardar={ediciones.guardarClave}
          enCurso={ediciones.enCurso}
          errores={ediciones.errores.secreto}
        />
        <ConfigApibara
          key={JSON.stringify(config)}
          config={config}
          puedeEditar={puedeEditar}
          ediciones={ediciones}
        />
        {puedeEditar && !sinClave ? <UsoDeApibara /> : null}
      </Bloque>
      {webPublica ? (
        <WebPublica
          webPublica={webPublica}
          vehiculosQueCambian={vehiculosQueCambian}
          puedeEditar={puedeEditar}
        />
      ) : null}
    </div>
  )
}
