'use client'

import { useState } from 'react'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { filaParaAccion } from '../../../entities/acciones-de-fila'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import type { FilaDeLead } from '../../../entities/listado'
import { useAccionDeFila } from '../hooks/use-accion-de-fila'
import { ModalDeAccionDeFilaDiferido } from './diferidos'

type Props = {
  filas: readonly FilaDeLead[]
  // `leads.editar`: con el lead en la cartera, anotar y agendar.
  puedeAnotar: boolean
}

// Lo que abre el «⋯» de una fila: el modal de anotar un seguimiento o de agendar un recordatorio sobre
// ese lead, sin abrir el drawer ni la ficha. Se monta una vez en el listado y se pide al abrirse. La
// URL se revisa al abrir: una fila que no está en la página, ajena o inventada no abre y lo dice como
// un lead que no existe. Ya abierto, el lead queda fijo: volver a leer la lista no lo cierra.
export function AccionesDeFila({ filas, puedeAnotar }: Props) {
  const url = useAccionDeFila()
  const fila = url.accion && url.para !== null ? filaParaAccion(filas, url.para, puedeAnotar) : null
  const apertura = useApertura(url.accion !== null)
  const clave = url.accion ? `${String(apertura)}:${url.accion}:${url.para ?? ''}` : null
  const rechazada = useRevisionAlAbrir(
    clave,
    fila ? null : MENSAJE_DE_LEAD_NO_DISPONIBLE,
    url.cerrar,
  )
  const abierto = clave !== null && !rechazada
  const lead = useUltimo(abierto ? fila : null)
  const accion = useUltimo(abierto ? url.accion : null)
  const montar = useAbiertoAlgunaVez(abierto)
  // Los tipos activos se piden la primera vez que se anota y quedan para las siguientes.
  const [tipos, setTipos] = useState<readonly TipoDeSeguimiento[] | null>(null)
  if (!montar || lead === null || accion === null) {
    return null
  }
  return (
    <ModalDeAccionDeFilaDiferido
      key={`${String(apertura)}:${accion}:${lead.id}`}
      accion={accion}
      lead={lead}
      abierto={abierto}
      alCerrar={url.cerrar}
      tipos={tipos}
      alLeerTipos={setTipos}
    />
  )
}
