'use client'

import { MapPinIcon, PlusIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  alTopeDeOrigenes,
  TEXTO_DEL_TOPE,
  type OrigenDeLeadConUso,
} from '../../../entities/origen-de-lead'
import { useFocoTrasMover } from '../hooks/use-foco-tras-mover'
import { useModalDeOrigen } from '../hooks/use-modal-de-origen'
import { useOrigenesDeLead } from '../hooks/use-origenes-de-lead'
import { ModalDeOrigenDiferido } from './diferidos'
import { ListaDeOrigenes } from './lista-de-origenes'

type Props = {
  origenes: readonly OrigenDeLeadConUso[]
}

const BOTON = 'h-11 md:h-8'

// El botón de «Nuevo origen» va arriba cuando hay lista; en el vacío lo lleva el estado vacío (uno solo).
function Encabezado({ alNuevo, alTope }: { alNuevo: (() => void) | null; alTope: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="grid gap-0.5">
        <h2
          id="titulo-de-origenes"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Orígenes del lead
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          De dónde llegó cada lead. El orden de acá es el del alta y el del filtro del listado.
        </p>
      </div>
      {alNuevo ? (
        <Button
          className={BOTON}
          disabled={alTope}
          aria-describedby={alTope ? 'origenes-tope' : undefined}
          onClick={alNuevo}
        >
          <PlusIcon aria-hidden />
          Nuevo origen
        </Button>
      ) : null}
    </div>
  )
}

// Configuración › Leads › Orígenes: de dónde llegan los leads. Se crean, renombran, ordenan, activan y
// desactivan; uno con leads no se elimina, se desactiva (sigue nombrando a los leads que ya lo tienen
// y no se ofrece para uno nuevo). Hasta 100, dicho al llegar; la lista no se pagina. Sin ninguno
// activo el alta sigue andando y guarda los leads sin origen. Todo cambio lo hace la base por RPC con
// su versión, y cada respuesta trae la lista entera.
export function OrigenesDeLead({ origenes: inicial }: Props) {
  const lista = useOrigenesDeLead(inicial)
  const { origenes } = lista
  const modal = useModalDeOrigen(origenes)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const alTope = alTopeDeOrigenes(origenes)
  useFocoTrasMover(lista.movimiento)

  return (
    <section className="grid gap-3" aria-labelledby="titulo-de-origenes">
      <Encabezado alTope={alTope} alNuevo={origenes.length > 0 ? modal.abrirNuevo : null} />
      {alTope ? (
        <Aviso tono="aviso">
          <span id="origenes-tope">{TEXTO_DEL_TOPE}</span>
        </Aviso>
      ) : null}
      {origenes.length === 0 ? (
        <EstadoVacio
          Icono={MapPinIcon}
          titulo="Todavía no hay orígenes del lead"
          descripcion="Sin ninguno, el alta guarda los leads sin origen y el campo sale apagado."
          accion={
            <Button className={BOTON} onClick={modal.abrirNuevo}>
              <PlusIcon aria-hidden />
              Nuevo origen
            </Button>
          }
        />
      ) : (
        <ListaDeOrigenes lista={lista} alEditar={modal.abrirEdicion} />
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {lista.anuncio}
      </p>
      {montar ? (
        <ModalDeOrigenDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          origenes={lista}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
    </section>
  )
}
