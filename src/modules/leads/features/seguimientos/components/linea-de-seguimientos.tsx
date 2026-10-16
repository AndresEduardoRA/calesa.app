'use client'

import { MessageSquareTextIcon } from 'lucide-react'
import { useRef, useSyncExternalStore, type RefObject } from 'react'
import { leerBorradorDeEstado } from '@/shared/lib/borrador'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import {
  claveDelBorradorDeSeguimiento,
  MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO,
} from '../../../entities/edicion-de-seguimiento'
import type { Recordatorio } from '../../../entities/recordatorios'
import { puedeEditarSeguimiento } from '../../../entities/seguimiento'
import { useEliminarSeguimiento } from '../hooks/use-eliminar-seguimiento'
import { useModalDeSeguimiento } from '../hooks/use-modal-de-seguimiento'
import type { Seguimientos } from '../hooks/use-seguimientos'
import { ModalDeSeguimientoDiferido } from './diferidos'
import { ItemDeSeguimiento } from './item-de-seguimiento'

type Props = {
  leadId: string
  tipos: readonly TipoDeSeguimiento[]
  zona: string
  seguimientos: Seguimientos
  // El próximo contacto que entró con un seguimiento: va a «Tus recordatorios».
  alAgendar: (recordatorio: Recordatorio) => void
}

const sinSuscripcion = () => () => undefined

// ¿Quedó algo escrito sin guardar al anotar? (se cerró con «atrás», o se recargó y no se reabrió). El
// servidor no tiene el almacenamiento de la pestaña: allá es «no».
function useHayBorrador(leadId: string): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => {
      try {
        return (
          leerBorradorDeEstado(
            window.sessionStorage,
            claveDelBorradorDeSeguimiento(leadId, null),
          ) !== null
        )
      } catch {
        return false
      }
    },
    () => false,
  )
}

// «Anotar seguimiento» o, con un borrador, «Tienes un seguimiento sin guardar» con «Continuar»: no se
// abre solo. Sin tipos activos, el botón se apaga y dice por qué.
function Anotar({
  boton,
  sinTipos,
  conBorrador,
  alAbrir,
}: {
  boton: RefObject<HTMLButtonElement | null>
  sinTipos: boolean
  conBorrador: boolean
  alAbrir: () => void
}) {
  if (conBorrador && !sinTipos) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3">
        <p className="text-(length:--text-sm) text-(--color-ink)">
          Tienes un seguimiento sin guardar.
        </p>
        <Button ref={boton} type="button" className="min-h-11 md:min-h-9" onClick={alAbrir}>
          Continuar
        </Button>
      </div>
    )
  }
  return (
    <div className="grid gap-1">
      <Button
        ref={boton}
        type="button"
        className="min-h-11 w-fit md:min-h-9"
        onClick={alAbrir}
        disabled={sinTipos}
        aria-describedby={sinTipos ? 'seguimiento-sin-tipos' : undefined}
      >
        Anotar seguimiento
      </Button>
      {sinTipos ? (
        <p id="seguimiento-sin-tipos" className="text-(length:--text-sm) text-(--color-ink-faint)">
          {MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO}
        </p>
      ) : null}
    </div>
  )
}

// Los seguimientos, o el vacío. Editar y eliminar, sólo lo propio con la cartera.
function Lista({
  seguimientos,
  zona,
  alEditar,
  eliminacion,
}: {
  seguimientos: Seguimientos
  zona: string
  alEditar: (id: string) => void
  eliminacion: ReturnType<typeof useEliminarSeguimiento>
}) {
  const { puedoAnotar } = seguimientos
  if (seguimientos.lista.length === 0) {
    return (
      <EstadoVacio
        compacto
        Icono={MessageSquareTextIcon}
        titulo="Todavía no hay seguimientos"
        descripcion={
          puedoAnotar
            ? 'Cada contacto con este lead queda acá. Anota el primero.'
            : 'Cada contacto con este lead queda acá.'
        }
      />
    )
  }
  return (
    <ol className="grid gap-2">
      {seguimientos.lista.map((s) => (
        <li key={s.id}>
          <ItemDeSeguimiento
            seguimiento={s}
            zona={zona}
            editable={puedeEditarSeguimiento(s, puedoAnotar)}
            enCurso={eliminacion.enCurso}
            alEditar={() => {
              alEditar(s.id)
            }}
            alEliminar={() => void eliminacion.eliminar(s)}
          />
        </li>
      ))}
    </ol>
  )
}

// La línea de tiempo de un lead, más recientes primero: «Anotar», los seguimientos (editar y eliminar
// lo propio) y «Ver más». Anotar y editar abren el modal con su URL. Lo que cada quien ve lo decidió la
// base; acá no se cuenta nada, para no insinuar los privados de otros. La usan la ficha y la pestaña
// «Seguimientos» del drawer (el modal se dibuja adentro: Base UI lo anida).
export function LineaDeSeguimientos({ leadId, tipos, zona, seguimientos, alAgendar }: Props) {
  const boton = useRef<HTMLButtonElement>(null)
  const { puedoAnotar } = seguimientos
  const eliminacion = useEliminarSeguimiento(seguimientos.poner)
  const modal = useModalDeSeguimiento({ seguimientos, hayTipos: tipos.length > 0 })
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const conBorrador = useHayBorrador(leadId) && puedoAnotar && !modal.abierto
  return (
    <section aria-label="Seguimientos" className="grid min-w-0 content-start gap-3">
      {puedoAnotar ? (
        <Anotar
          boton={boton}
          sinTipos={tipos.length === 0}
          conBorrador={conBorrador}
          alAbrir={modal.abrirAnotar}
        />
      ) : null}
      <Lista
        seguimientos={seguimientos}
        zona={zona}
        alEditar={modal.abrirEdicion}
        eliminacion={eliminacion}
      />
      {seguimientos.hayMas ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          onClick={() => void seguimientos.cargarMas()}
          disabled={seguimientos.cargando}
        >
          {seguimientos.cargando ? 'Cargando…' : 'Ver más'}
        </Button>
      ) : null}
      {montar ? (
        <ModalDeSeguimientoDiferido
          key={modal.llave}
          abierto={modal.abierto}
          alCerrar={modal.cerrar}
          leadId={leadId}
          tipos={tipos}
          zona={zona}
          original={modal.original}
          noDisponible={modal.noDisponible}
          alGuardar={(guardado, recordatorio) => {
            seguimientos.poner(guardado)
            if (recordatorio) {
              alAgendar(recordatorio)
            }
            modal.cerrar()
          }}
          focoAlCerrar={() => modal.focoAlCerrar() ?? boton.current ?? true}
          recargar={() => void seguimientos.releer()}
          recargando={seguimientos.cargando}
        />
      ) : null}
    </section>
  )
}
