'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Bloque } from '@/shared/ui/bloque'
import { Interruptor } from '@/shared/ui/interruptor'
import { configDeApibara, puedeActivarse, type Integracion } from '../../../entities/integraciones'
import { MOTIVO_SIN_PERMISO_AJUSTES, MOTIVO_SIN_SECRETO } from '../../../entities/motivos'
import { useApibara } from '../hooks/use-apibara'
import { CampoSecreto } from './campo-secreto'
import { ConfigApibara } from './config-apibara'

type Props = {
  // La fila de apibara. Quien usa esto le pone `key={apibara.actualizadoEn}`: sus tres ediciones
  // tocan la misma fila, y cada una deja a la pantalla con la versión nueva.
  apibara: Integracion
  puedeEditar: boolean
}

// La pestaña «Integraciones». Hoy, apibara: su interruptor, su configuración no secreta y su
// clave, que va a Vault y no se vuelve a mostrar.
export function Integraciones({ apibara, puedeEditar }: Props) {
  const ediciones = useApibara(apibara.actualizadoEn)
  const sinClave = !puedeActivarse(apibara)

  return (
    <div className="grid gap-4">
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
          guardadoEn={apibara.secretoGuardadoEn}
          puedeEditar={puedeEditar}
          ediciones={ediciones}
        />
        <ConfigApibara
          config={configDeApibara(apibara.config)}
          puedeEditar={puedeEditar}
          ediciones={ediciones}
        />
      </Bloque>
    </div>
  )
}
