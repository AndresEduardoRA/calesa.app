'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { motivoParaNoAbrirNuevaFase } from '../../../entities/fases/panel-de-fase'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { useEliminarFasePorUrl } from '../hooks/use-eliminar-fase-por-url'
import { useListaDeFases } from '../hooks/use-lista-de-fases'
import { useModalDeNuevaFase } from '../hooks/use-modal-de-nueva-fase'
import { ConfirmarEliminarFaseDiferido, ModalDeNuevaFaseDiferido } from './diferidos'

type Props = { flujo: FlujoParaConfigurar }

const ID_DEL_MOTIVO = 'motivo-de-nueva-fase'

// El hueco `accionesDeLaLista` de la pantalla de flujos: «Nueva fase» a la derecha del título, y —una vez por pantalla— el modal que abre y la
// confirmación de «Jubilar o eliminar», que se abren por la URL y se piden con `diferido()` la primera vez. Sin permiso no hay nada que apagar: el selector
// de flujos sólo ofrece los que la persona configura (D1).
export function AccionesDeLaLista({ flujo }: Props) {
  const lista = useListaDeFases(flujo)
  const modal = useModalDeNuevaFase(flujo)
  const montarModal = useAbiertoAlgunaVez(modal.abierto)
  const quitar = useEliminarFasePorUrl(flujo)
  const montarQuitar = useAbiertoAlgunaVez(quitar.abierto)
  const motivo = motivoParaNoAbrirNuevaFase(flujo)

  return (
    <div className="grid justify-items-end gap-1">
      <Button
        className="h-11 md:h-8"
        disabled={motivo !== null}
        aria-describedby={motivo === null ? undefined : ID_DEL_MOTIVO}
        onClick={modal.abrir}
      >
        <PlusIcon aria-hidden />
        Nueva fase
      </Button>
      {motivo === null ? null : (
        <p id={ID_DEL_MOTIVO} className="text-(length:--text-sm) text-(--color-ink-faint)">
          {motivo}
        </p>
      )}
      {montarModal ? (
        <ModalDeNuevaFaseDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          lista={lista}
        />
      ) : null}
      {montarQuitar ? (
        <ConfirmarEliminarFaseDiferido
          key={quitar.apertura}
          abierto={quitar.abierto}
          alCerrar={quitar.cerrar}
          fase={quitar.fase}
          lista={lista}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-mas-acciones="fase-${quitar.fase?.id ?? ''}-mas"]`,
            ) ?? true
          }
        />
      ) : null}
    </div>
  )
}
