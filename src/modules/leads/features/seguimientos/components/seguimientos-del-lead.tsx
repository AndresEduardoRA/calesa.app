'use client'

import { MessageSquareTextIcon } from 'lucide-react'
import { useRef, useState, useSyncExternalStore } from 'react'
import { leerBorradorDeEstado } from '@/shared/lib/borrador'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useRegional } from '@/shared/ui/regional'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import { puedeEditarSeguimiento, type PaginaDeSeguimientos } from '../../../entities/seguimiento'
import { useEliminarSeguimiento } from '../hooks/use-eliminar-seguimiento'
import { useSeguimientos, type Seguimientos } from '../hooks/use-seguimientos'
import { ItemDeSeguimiento } from './item-de-seguimiento'
import { RedactorDeSeguimiento } from './redactor-de-seguimiento'

type Props = {
  leadId: string
  inicial: PaginaDeSeguimientos
  tipos: readonly TipoDeSeguimiento[]
}

// ¿Quedó algo escrito sin guardar? Entonces el redactor arranca abierto, con eso adentro.
function hayBorrador(leadId: string): boolean {
  try {
    return leerBorradorDeEstado(window.sessionStorage, `seguimiento-nuevo-${leadId}`) !== null
  } catch {
    return false
  }
}

const sinSuscripcion = () => () => undefined

function Anotar({ tipos, alAbrir }: { tipos: readonly TipoDeSeguimiento[]; alAbrir: () => void }) {
  const sinTipos = tipos.length === 0
  return (
    <div className="grid gap-1">
      <Button
        type="button"
        className="min-h-11 w-fit md:min-h-9"
        onClick={alAbrir}
        disabled={sinTipos}
      >
        Anotar seguimiento
      </Button>
      {sinTipos ? (
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          No hay tipos de seguimiento activos.
        </p>
      ) : null}
    </div>
  )
}

type PropsDeLaLinea = {
  leadId: string
  tipos: readonly TipoDeSeguimiento[]
  zona: string
  puedoAnotar: boolean
  seguimientos: Seguimientos
}

// La lista, más recientes primero. Editar reemplaza el ítem por el redactor, en su lugar.
function LineaDeTiempo({ leadId, tipos, zona, puedoAnotar, seguimientos }: PropsDeLaLinea) {
  const eliminacion = useEliminarSeguimiento(seguimientos.poner)
  const [editando, setEditando] = useState<string | null>(null)
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
          {editando === s.id ? (
            <RedactorDeSeguimiento
              leadId={leadId}
              tipos={tipos}
              zona={zona}
              original={s}
              alGuardar={(editado) => {
                seguimientos.poner(editado)
                setEditando(null)
              }}
              alCerrar={() => {
                setEditando(null)
              }}
            />
          ) : (
            <ItemDeSeguimiento
              seguimiento={s}
              zona={zona}
              editable={puedeEditarSeguimiento(s, puedoAnotar)}
              enCurso={eliminacion.enCurso}
              alEditar={() => {
                setEditando(s.id)
              }}
              alEliminar={() => void eliminacion.eliminar(s)}
            />
          )}
        </li>
      ))}
    </ol>
  )
}

// La sección «Seguimientos» de la ficha: el redactor (sólo con el lead en la cartera y
// `leads.editar`) y la línea de tiempo. Lo que cada quien ve lo decidió la base; acá no se cuenta
// nada, para no insinuar los privados de otros.
export function SeguimientosDelLead({ leadId, inicial, tipos }: Props) {
  const { zonaHoraria } = useRegional()
  const seguimientos = useSeguimientos(leadId, inicial)
  const puedoAnotar = inicial.puedoAnotar
  // Con algo escrito sin guardar, el redactor arranca abierto. Se mira una sola vez: el borrador
  // se reescribe mientras el redactor lo repone, y releerlo en medio lo cerraría. El servidor no
  // tiene el almacenamiento de la pestaña: allá es «no».
  const leido = useRef<boolean | null>(null)
  const conBorrador = useSyncExternalStore(
    sinSuscripcion,
    () => (leido.current ??= puedoAnotar && hayBorrador(leadId)),
    () => false,
  )
  const [elegido, setAnotando] = useState<boolean | null>(null)
  const anotando = elegido ?? conBorrador
  return (
    <section aria-label="Seguimientos" className="grid gap-3">
      {puedoAnotar && anotando ? (
        <RedactorDeSeguimiento
          leadId={leadId}
          tipos={tipos}
          zona={zonaHoraria}
          original={null}
          alGuardar={(nuevo) => {
            seguimientos.poner(nuevo)
            setAnotando(false)
          }}
          alCerrar={() => {
            setAnotando(false)
          }}
        />
      ) : null}
      {puedoAnotar && !anotando ? (
        <Anotar
          tipos={tipos}
          alAbrir={() => {
            setAnotando(true)
          }}
        />
      ) : null}
      <LineaDeTiempo
        leadId={leadId}
        tipos={tipos}
        zona={zonaHoraria}
        puedoAnotar={puedoAnotar}
        seguimientos={seguimientos}
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
    </section>
  )
}
