'use client'

import { useEffect, useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { avisarExito } from '@/shared/ui/toasts'
import { leerTiposDeSeguimiento } from '../../../composicion.client'
import type { AccionDeFila } from '../../../entities/acciones-de-fila'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import { MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO } from '../../../entities/edicion-de-seguimiento'
import type { FilaDeLead } from '../../../entities/listado'
import { ModalDeRecordatorio } from '../../recordatorios/components/modal-de-recordatorio'
import { ModalDeSeguimiento } from '../../seguimientos/components/modal-de-seguimiento'

type Props = {
  accion: AccionDeFila
  lead: FilaDeLead
  abierto: boolean
  alCerrar: () => void
  // Los tipos activos, si ya se leyeron en otra apertura.
  tipos: readonly TipoDeSeguimiento[] | null
  alLeerTipos: (tipos: readonly TipoDeSeguimiento[]) => void
}

// El «⋯» de la fila que se abrió (la tabla y las tarjetas lo dibujan las dos; se busca el que se ve).
function menuDeLaFila(leadId: string): HTMLElement | boolean {
  const menus = document.querySelectorAll<HTMLElement>(`[data-menu-de-lead="${leadId}"]`)
  return Array.from(menus).find((menu) => menu.offsetParent !== null) ?? true
}

// Los tipos activos, leídos una vez (sin RPC nueva: la misma consulta de la ficha).
function useTipos(tipos: Props['tipos'], alLeerTipos: Props['alLeerTipos']) {
  const [estado, setEstado] = useState<'cargando' | 'error'>('cargando')
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    if (tipos !== null) {
      return
    }
    let vigente = true
    void leerTiposDeSeguimiento()
      .catch(() => null)
      .then((leidos) => {
        if (!vigente) {
          return
        }
        if (leidos?.ok) {
          alLeerTipos(leidos.data)
        } else {
          setEstado('error')
        }
      })
    return () => {
      vigente = false
    }
  }, [tipos, alLeerTipos, intento])
  return {
    estado,
    reintentar: () => {
      setEstado('cargando')
      setIntento((n) => n + 1)
    },
  }
}

// Mientras llegan los tipos, si no se pudieron leer o si no hay ninguno activo: el modal lo dice.
function SinFormulario({
  abierto,
  alCerrar,
  lead,
  estado,
  reintentar,
}: Pick<Props, 'abierto' | 'alCerrar' | 'lead'> & {
  estado: 'cargando' | 'error' | 'sin_tipos'
  reintentar: () => void
}) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Anotar seguimiento"
      descripcion={`Sobre «${lead.nombre}».`}
      focoAlCerrar={() => menuDeLaFila(lead.id)}
      pie={
        <Button variant="ghost" onClick={alCerrar}>
          Cerrar
        </Button>
      }
    >
      {estado === 'cargando' ? (
        <div aria-busy="true" aria-label="Cargando" className="grid gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : null}
      {estado === 'error' ? (
        <Aviso tono="peligro">
          <p>No pudimos cargar los tipos de seguimiento.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 min-h-11 md:min-h-7"
            onClick={reintentar}
          >
            Reintentar
          </Button>
        </Aviso>
      ) : null}
      {estado === 'sin_tipos' ? (
        <Aviso tono="aviso">
          {MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO} Pídele a quien administra los leads que active uno.
        </Aviso>
      ) : null}
    </Modal>
  )
}

function AnotarDesdeLaFila({ lead, abierto, alCerrar, tipos, alLeerTipos }: Omit<Props, 'accion'>) {
  const { zonaHoraria } = useRegional()
  const lectura = useTipos(tipos, alLeerTipos)
  if (tipos === null || tipos.length === 0) {
    return (
      <SinFormulario
        abierto={abierto}
        alCerrar={alCerrar}
        lead={lead}
        estado={tipos === null ? lectura.estado : 'sin_tipos'}
        reintentar={lectura.reintentar}
      />
    )
  }
  return (
    <ModalDeSeguimiento
      abierto={abierto}
      alCerrar={alCerrar}
      leadId={lead.id}
      tipos={tipos}
      zona={zonaHoraria}
      original={null}
      noDisponible={null}
      alGuardar={() => {
        avisarExito(`Seguimiento anotado en «${lead.nombre}».`)
        alCerrar()
      }}
      focoAlCerrar={() => menuDeLaFila(lead.id)}
      // Anotar no tiene versión: no hay conflicto que recargar.
      recargar={() => undefined}
      recargando={false}
    />
  )
}

// Anotar un seguimiento o agendar un recordatorio desde el «⋯» de una fila: los mismos modales de la
// ficha, sobre ese lead, sin abrir el drawer. Al guardar, un aviso de éxito (la fila no muestra nada
// de seguimientos ni de recordatorios: no hay nada que actualizar). El vehículo no se ofrece: el
// listado no lee los vehículos del lead.
export function ModalDeAccionDeFila({ accion, ...props }: Props) {
  const { zonaHoraria } = useRegional()
  if (accion === 'anotar') {
    return <AnotarDesdeLaFila {...props} />
  }
  const { lead, abierto, alCerrar } = props
  return (
    <ModalDeRecordatorio
      abierto={abierto}
      alCerrar={alCerrar}
      leadId={lead.id}
      zona={zonaHoraria}
      original={null}
      noDisponible={null}
      alGuardar={() => {
        avisarExito(`Recordatorio agendado para «${lead.nombre}».`)
        alCerrar()
      }}
      focoAlCerrar={() => menuDeLaFila(lead.id)}
    />
  )
}
