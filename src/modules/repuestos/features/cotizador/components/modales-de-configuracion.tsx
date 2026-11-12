'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { useModalDeConfiguracion } from '../hooks/use-modal-de-configuracion'
import { ModalDeCajaDiferido, ModalDeTramoDiferido } from './diferidos'

type Props = { modal: ReturnType<typeof useModalDeConfiguracion> }

// Los modales de tramo y de caja (8.12-2, C9), cada uno montado la primera vez que se abre y con una `key` por apertura.
export function ModalesDeConfiguracion({ modal }: Props) {
  const abierto = modal.modal
  const montarTramo = useAbiertoAlgunaVez(modal.abierto && abierto?.tipo === 'tramo')
  const montarCaja = useAbiertoAlgunaVez(modal.abierto && abierto?.tipo === 'caja')
  return (
    <>
      {montarTramo && abierto?.tipo === 'tramo' ? (
        <ModalDeTramoDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.cerrar}
          moneda={abierto.moneda}
          original={abierto.tramo}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarCaja && abierto?.tipo === 'caja' ? (
        <ModalDeCajaDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.cerrar}
          moneda={abierto.moneda}
          original={abierto.caja}
          noDisponible={modal.noDisponible}
        />
      ) : null}
    </>
  )
}
