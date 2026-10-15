'use client'

import { MessageSquareTextIcon } from 'lucide-react'
import { useRef, useState, useSyncExternalStore } from 'react'
import { leerBorradorDeEstado } from '@/shared/lib/borrador'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useRegional } from '@/shared/ui/regional'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { Recordatorio } from '../../../entities/recordatorios'
import { BloqueDeRecordatorios } from '../../recordatorios/components/bloque-de-recordatorios'
import { useRecordatorios } from '../../recordatorios/hooks/use-recordatorios'
import { puedeEditarSeguimiento, type PaginaDeSeguimientos } from '../../../entities/seguimiento'
import { useEliminarSeguimiento } from '../hooks/use-eliminar-seguimiento'
import { useSeguimientos, type Seguimientos } from '../hooks/use-seguimientos'
import { ItemDeSeguimiento } from './item-de-seguimiento'
import { RedactorDeSeguimiento } from './redactor-de-seguimiento'

type Props = {
  leadId: string
  inicial: PaginaDeSeguimientos
  tipos: readonly TipoDeSeguimiento[]
  recordatorios: readonly Recordatorio[]
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
// `leads.editar`), la línea de tiempo y, al costado (arriba en el celular), «Tus recordatorios». Lo que cada quien ve lo decidió la base; acá no se cuenta
// nada, para no insinuar los privados de otros.
export function SeguimientosDelLead({ leadId, inicial, tipos, recordatorios }: Props) {
  const { zonaHoraria } = useRegional()
  const seguimientos = useSeguimientos(leadId, inicial)
  const deQuienMira = useRecordatorios(recordatorios)
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
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="lg:order-2">
        <BloqueDeRecordatorios
          leadId={leadId}
          zona={zonaHoraria}
          recordatorios={deQuienMira}
          puedeAgendar={puedoAnotar}
        />
      </div>
      <section aria-label="Seguimientos" className="grid min-w-0 content-start gap-3 lg:order-1">
        {puedoAnotar && anotando ? (
          <RedactorDeSeguimiento
            leadId={leadId}
            tipos={tipos}
            zona={zonaHoraria}
            original={null}
            alGuardar={(nuevo, recordatorio) => {
              seguimientos.poner(nuevo)
              if (recordatorio) {
                deQuienMira.poner(recordatorio)
              }
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
    </div>
  )
}
