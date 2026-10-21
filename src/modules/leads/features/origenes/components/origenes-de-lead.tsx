'use client'

import { MapPinIcon, PlusIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  alTopeDeOrigenes,
  TEXTO_DEL_TOPE,
  type OrigenDeLeadConUso,
} from '../../../entities/origen-de-lead'
import { useEliminarOrigenPorUrl } from '../hooks/use-eliminar-origen-por-url'
import { useModalDeOrigen } from '../hooks/use-modal-de-origen'
import { useOrigenesDeLead } from '../hooks/use-origenes-de-lead'
import { EliminarOrigenDiferido, ModalDeOrigenDiferido } from './diferidos'
import { ListaDeOrigenes, PREFIJO_DE_ORIGENES } from './lista-de-origenes'

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

// Configuración › Leads › Orígenes: de dónde llegan los leads. Se crean, renombran, eligen su icono, ordenan, activan y
// desactivan, y uno se marca «por defecto» (el que el alta propone a quien no tiene un último origen); uno con leads no se elimina, se desactiva (sigue nombrando a los leads que ya lo tienen
// y no se ofrece para uno nuevo). Hasta 100, dicho al llegar; la lista no se pagina. Sin ninguno
// activo el alta sigue andando y guarda los leads sin origen. Todo cambio lo hace la base por RPC con
// su versión, y cada respuesta trae la lista entera.
export function OrigenesDeLead({ origenes: inicial }: Props) {
  const lista = useOrigenesDeLead(inicial)
  const { origenes } = lista
  const modal = useModalDeOrigen(origenes)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const eliminacion = useEliminarOrigenPorUrl(origenes)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const alTope = alTopeDeOrigenes(origenes)
  useFocoTrasMover(PREFIJO_DE_ORIGENES, lista.movimiento)

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
        <ListaDeOrigenes
          lista={lista}
          alEditar={modal.abrirEdicion}
          alPedirEliminar={eliminacion.abrir}
        />
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
      {montarEliminar ? (
        <EliminarOrigenDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          origen={eliminacion.origen}
          enCurso={lista.enCurso}
          alEliminar={lista.eliminar}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-mas-acciones="${PREFIJO_DE_ORIGENES}-${eliminacion.origen?.id ?? ''}-mas"]`,
            ) ?? true
          }
        />
      ) : null}
    </section>
  )
}
