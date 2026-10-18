'use client'

import { useState } from 'react'
import { ConfirmarDescarte } from '@/shared/ui/confirmar-descarte'
import { Modal } from '@/shared/ui/modal'
import { useCierreConCambios } from '@/shared/ui/use-cierre-con-cambios'
import { Skeleton } from '@/shared/ui/skeleton'
import { EstadoError } from '@/shared/ui/estados'
import type { Etiquetas } from '../hooks/use-etiquetas'
import { useGestionDeEtiquetas } from '../hooks/use-gestion-de-etiquetas'
import { usePanelDeEtiquetas } from '../hooks/use-panel-de-etiquetas'
import { FilaDeEtiqueta } from './fila-de-etiqueta'
import { NuevaEtiqueta } from './nueva-etiqueta'

// Lo de adentro se monta al abrir: así la lista (con a cuántos leads toca cada una) es la de ahora.
function ContenidoDeEtiquetas({
  etiquetas,
  alEscribir,
}: {
  etiquetas: Etiquetas
  alEscribir: (hayTexto: boolean) => void
}) {
  const gestion = useGestionDeEtiquetas(etiquetas)
  const { estado } = gestion
  return (
    <div className="grid gap-3">
      <NuevaEtiqueta
        etiquetas={etiquetas}
        alCrear={(una) => gestion.sumar({ ...una, leads: 0 })}
        alEscribir={alEscribir}
      />
      {estado.tipo === 'cargando' ? (
        <div aria-busy="true" aria-label="Cargando tus etiquetas" className="grid gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : null}
      {estado.tipo === 'error' ? (
        <EstadoError titulo="No se pudieron cargar tus etiquetas" alReintentar={gestion.leer} />
      ) : null}
      {estado.tipo === 'listo' && estado.lista.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Todavía no tienes etiquetas. Crea una arriba o desde «Etiquetas» en un lead.
        </p>
      ) : null}
      {estado.tipo === 'listo' && estado.lista.length > 0 ? (
        <ul aria-label="Tus etiquetas" className="grid max-h-[60vh] overflow-y-auto">
          {estado.lista.map((una) => (
            <FilaDeEtiqueta
              key={`${una.id}:${una.actualizadoEn}`}
              etiqueta={una}
              todas={estado.lista}
              enCurso={gestion.enCurso}
              alGuardar={(cambios) => gestion.guardar(una, cambios)}
              alEliminar={() => gestion.eliminar(una)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

// «Gestionar etiquetas» (`?panel=etiquetas`): crear, renombrar, recolorear y eliminar las
// etiquetas propias. Se abre desde el selector de un lead y desde los filtros del listado. Renombrar, recolorear y
// eliminar guardan en la fila; lo único sin guardar es el nombre de la etiqueta nueva: con algo escrito ahí, cerrar
// pregunta en el mismo modal, como en todo formulario, y no se cierra mientras se crea.
export function DialogoDeEtiquetas({ etiquetas }: { etiquetas: Etiquetas }) {
  const panel = usePanelDeEtiquetas()
  const [hayTexto, setHayTexto] = useState(false)
  const cierre = useCierreConCambios({
    hayCambios: hayTexto,
    alCerrar: panel.cerrar,
    abierto: panel.abierto,
  })
  return (
    <Modal
      abierto={panel.abierto}
      alCerrar={cierre.intentarCerrar}
      bloqueado={etiquetas.creando}
      titulo="Tus etiquetas"
      descripcion="Solo las ves tú. Un cambio de nombre o de color se ve en todos los leads donde la pusiste."
      pie={
        cierre.confirmando ? (
          <ConfirmarDescarte alSeguir={cierre.seguir} alDescartar={cierre.descartar} />
        ) : undefined
      }
    >
      {panel.abierto ? (
        <ContenidoDeEtiquetas etiquetas={etiquetas} alEscribir={setHayTexto} />
      ) : null}
    </Modal>
  )
}
