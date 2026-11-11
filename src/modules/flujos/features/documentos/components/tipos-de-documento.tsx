'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { VistasDeGrupos } from '../../../entities/documentos/vista-de-grupo'
import { useEliminarTipoPorUrl } from '../hooks/use-eliminar-tipo-por-url'
import { useModalDeTipo } from '../hooks/use-modal-de-tipo'
import { useTiposDeDocumento } from '../hooks/use-tipos-de-documento'
import { EliminarTipoDiferido, ModalDeTipoDiferido } from './diferidos'
import { GrupoDeTipos } from './grupo-de-tipos'

type Props = {
  vistas: VistasDeGrupos
  // El flujo elegido, para nombrarlo («Sólo de Miami»); nulo si no hay.
  nombreDelFlujo: string | null
  // Entre los dos grupos va el selector de flujo, que dibuja el servidor.
  selector: React.ReactNode
}

// Configuración › Flujos › Documentos: los tipos de documento de toda la empresa y los del flujo elegido. Los dos grupos vienen de la página (las
// escrituras no devuelven la lista: la página se vuelve a leer), un solo modal y una sola confirmación por la URL sirven a los dos.
export function TiposDeDocumento({ vistas, nombreDelFlujo, selector }: Props) {
  const tipos = useTiposDeDocumento(vistas)
  const modal = useModalDeTipo(vistas)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const eliminacion = useEliminarTipoPorUrl(vistas)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const flujoId = modal.grupo === 'flujo' ? (vistas.flujo?.grupo.flujoId ?? null) : null
  const prefijoDelMas = eliminacion.tipo?.flujoId == null ? 'empresa' : 'flujo'

  return (
    <div className="grid gap-6">
      <GrupoDeTipos
        clave="empresa"
        vista={vistas.empresa}
        titulo="De toda la empresa"
        detalle="Se piden en cualquier flujo que los use."
        vacio="No hay tipos de toda la empresa."
        tipos={tipos}
        alNuevo={modal.abrirNuevo}
        alEditar={modal.abrirEdicion}
        alPedirEliminar={eliminacion.abrir}
      />
      {selector}
      {vistas.flujo ? (
        <GrupoDeTipos
          clave="flujo"
          vista={vistas.flujo}
          titulo="Sólo de este flujo"
          detalle={
            nombreDelFlujo
              ? `Sólo se piden en «${nombreDelFlujo}».`
              : 'Sólo se piden en el flujo elegido.'
          }
          vacio="Este flujo no tiene tipos propios. Crea el primero con «Nuevo tipo»."
          tipos={tipos}
          alNuevo={modal.abrirNuevo}
          alEditar={modal.abrirEdicion}
          alPedirEliminar={eliminacion.abrir}
        />
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {tipos.anuncio}
      </p>
      {montar && modal.grupo ? (
        <ModalDeTipoDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          tipos={tipos}
          original={modal.original}
          grupo={modal.grupo}
          flujoId={flujoId}
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
              `[data-mas-acciones="tipo-de-documento-${prefijoDelMas}-${eliminacion.tipo?.id ?? ''}-mas"]`,
            ) ?? true
          }
        />
      ) : null}
    </div>
  )
}
