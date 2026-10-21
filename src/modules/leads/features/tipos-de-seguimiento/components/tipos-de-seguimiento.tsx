'use client'

import { PlusIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  alTopeDeTiposDeSeguimiento,
  sinTiposActivos,
  textoDelTopeDeSeguimientos,
  type ListaDeTiposDeSeguimiento,
} from '../../../entities/tipo-de-seguimiento'
import { useEliminarTipoDeSeguimientoPorUrl } from '../hooks/use-eliminar-tipo-de-seguimiento-por-url'
import { useModalDeTipoDeSeguimiento } from '../hooks/use-modal-de-tipo-de-seguimiento'
import { useTiposDeSeguimiento } from '../hooks/use-tipos-de-seguimiento'
import { filasDeTiposDeSeguimiento } from './filas-de-tipos-de-seguimiento'
import { EliminarTipoDeSeguimientoDiferido, ModalDeTipoDeSeguimientoDiferido } from './diferidos'

type Props = {
  lista: ListaDeTiposDeSeguimiento
}

const BOTON = 'h-11 md:h-8'
const PREFIJO = 'tipo-de-seguimiento'

function Encabezado({ alNuevo, alTope }: { alNuevo: () => void; alTope: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="grid gap-0.5">
        <h2
          id="titulo-de-tipos-de-seguimiento"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Tipos de seguimiento
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Cómo se contactó a un lead: una llamada, una visita, un mensaje. El orden de acá es el del
          alta y el de «Anotar seguimiento».
        </p>
      </div>
      <Button
        className={BOTON}
        disabled={alTope}
        aria-describedby={alTope ? 'tipos-de-seguimiento-tope' : undefined}
        onClick={alNuevo}
      >
        <PlusIcon aria-hidden />
        Nuevo tipo
      </Button>
    </div>
  )
}

// Configuración › Leads › Tipos de seguimiento: se crean, renombran, eligen su icono, ordenan, activan y desactivan; uno con seguimientos
// no se elimina, se desactiva (sigue nombrando a los seguimientos que ya lo tienen y no se ofrece para uno nuevo). Ningún tipo es de sistema:
// cualquiera se apaga (sin ninguno activo, el alta guarda los leads sin primer seguimiento y lo dice). Hasta el tope que dice la base; la
// lista no se pagina. Todo cambio lo hace la base por RPC con su versión, y cada respuesta trae la lista entera.
export function TiposDeSeguimiento({ lista: inicial }: Props) {
  const tipos = useTiposDeSeguimiento(inicial)
  const { lista } = tipos
  const modal = useModalDeTipoDeSeguimiento(lista)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const eliminacion = useEliminarTipoDeSeguimientoPorUrl(lista.tipos)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const alTope = alTopeDeTiposDeSeguimiento(lista.tipos, lista.tope)
  useFocoTrasMover(PREFIJO, tipos.movimiento)

  const filas = filasDeTiposDeSeguimiento(lista, {
    alEditar: modal.abrirEdicion,
    alActivar: (uno, activo) => void tipos.activar(uno, activo),
    alPedirEliminar: eliminacion.abrir,
  })

  return (
    <section className="grid gap-3" aria-labelledby="titulo-de-tipos-de-seguimiento">
      <Encabezado alTope={alTope} alNuevo={modal.abrirNuevo} />
      {alTope ? (
        <Aviso tono="aviso">
          <span id="tipos-de-seguimiento-tope">{textoDelTopeDeSeguimientos(lista.tope)}</span>
        </Aviso>
      ) : null}
      {sinTiposActivos(lista.tipos) ? (
        <Aviso tono="aviso">
          Ningún tipo de seguimiento está activo: el alta guarda los leads sin primer seguimiento y
          «Anotar seguimiento» no tiene qué ofrecer.
        </Aviso>
      ) : null}
      {filas.length === 0 ? (
        <p className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 text-(--color-ink-soft)">
          Todavía no hay tipos de seguimiento. Crea el primero con «Nuevo tipo».
        </p>
      ) : (
        <ListaDeCatalogo
          filas={filas}
          prefijo={PREFIJO}
          columnaDeUso="Seguimientos"
          alAbrir={modal.abrirEdicion}
          alMover={(id, direccion) => {
            const tipo = lista.tipos.find((uno) => uno.id === id)
            if (tipo) void tipos.mover(tipo, direccion)
          }}
        />
      )}
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {lista.tipos.length} de {lista.tope} tipos de seguimiento posibles.
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {tipos.anuncio}
      </p>
      {montar ? (
        <ModalDeTipoDeSeguimientoDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          tipos={tipos}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarTipoDeSeguimientoDiferido
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
