'use client'

import { PlusIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { alTopeDeTipos, textoDelTope, type ListaDeTipos } from '../../../entities/tipo-de-lead'
import { useEliminarTipoPorUrl } from '../hooks/use-eliminar-tipo-por-url'
import { useModalDeTipo } from '../hooks/use-modal-de-tipo'
import { useTiposDeLead } from '../hooks/use-tipos-de-lead'
import { EliminarTipoDiferido, ModalDeTipoDiferido } from './diferidos'
import { filasDeTipos } from './filas-de-tipos'

type Props = {
  lista: ListaDeTipos
}

const BOTON = 'h-11 md:h-8'
const PREFIJO = 'tipo'

function Encabezado({ alNuevo, alTope }: { alNuevo: () => void; alTope: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="grid gap-0.5">
        <h2
          id="titulo-de-tipos"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Tipos de lead
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Cada tipo es de una clase, prospecto o cliente, que se elige al crearlo y no cambia. El
          orden de acá es el del alta y el del filtro del listado.
        </p>
      </div>
      <Button
        className={BOTON}
        disabled={alTope}
        aria-describedby={alTope ? 'tipos-tope' : undefined}
        onClick={alNuevo}
      >
        <PlusIcon aria-hidden />
        Nuevo tipo
      </Button>
    </div>
  )
}

// Configuración › Leads › Tipos de lead: se crean, renombran, eligen su icono, ordenan, activan y desactivan; uno con leads no se elimina, se
// desactiva (sigue nombrando a los leads que ya lo tienen y no se ofrece para uno nuevo). Cada tipo es de una clase fija
// —prospecto o cliente— y siempre queda uno activo de cada clase: el último de la suya no se apaga ni se elimina, y la fila lo
// dice antes de intentarlo. Hasta el tope que dice la base; la lista no se pagina. Todo cambio lo hace la base por RPC con su
// versión, y cada respuesta trae la lista entera.
export function TiposDeLead({ lista: inicial }: Props) {
  const tipos = useTiposDeLead(inicial)
  const { lista } = tipos
  const modal = useModalDeTipo(lista)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const eliminacion = useEliminarTipoPorUrl(lista.tipos)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const alTope = alTopeDeTipos(lista.tipos, lista.tope)
  useFocoTrasMover(PREFIJO, tipos.movimiento)

  return (
    <section className="grid gap-3" aria-labelledby="titulo-de-tipos">
      <Encabezado alTope={alTope} alNuevo={modal.abrirNuevo} />
      {alTope ? (
        <Aviso tono="aviso">
          <span id="tipos-tope">{textoDelTope(lista.tope)}</span>
        </Aviso>
      ) : null}
      <ListaDeCatalogo
        filas={filasDeTipos(lista.tipos, {
          alEditar: modal.abrirEdicion,
          alActivar: (tipo, activo) => void tipos.activar(tipo, activo),
          alPedirEliminar: eliminacion.abrir,
        })}
        prefijo={PREFIJO}
        columnaDeUso="Leads"
        alAbrir={modal.abrirEdicion}
        alMover={(id, direccion) => {
          const tipo = lista.tipos.find((uno) => uno.id === id)
          if (tipo) void tipos.mover(tipo, direccion)
        }}
      />
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {lista.tipos.length} de {lista.tope} tipos posibles.
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {tipos.anuncio}
      </p>
      {montar ? (
        <ModalDeTipoDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          tipos={tipos}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarTipoDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          tipo={eliminacion.tipo}
          enCurso={tipos.enCurso}
          alEliminar={tipos.eliminar}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-mas-acciones="${PREFIJO}-${eliminacion.tipo?.id ?? ''}-mas"]`,
            ) ?? true
          }
        />
      ) : null}
    </section>
  )
}
