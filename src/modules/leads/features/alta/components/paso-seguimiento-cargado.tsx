'use client'

import { useEffect, useRef } from 'react'
import { ID_DEL_SEGUIMIENTO_DEL_ALTA } from '../../../entities/alta'
import type { ContextoDeAlta } from '../../../entities/alta'
import { CamposDelSeguimiento } from '../../seguimientos/components/campos-del-seguimiento'
import type { AltaDeLead } from '../hooks/use-alta-de-lead'

type Props = {
  alta: AltaDeLead
  contexto: ContextoDeAlta
  zona: string
}

// El primer seguimiento del lead, opcional: los mismos campos que el redactor de la ficha (tipo, cuándo
// fue, resumen, detalle con formato y «Próximo contacto»). Los tipos salen de la base. Este módulo —y
// con él Tiptap— se pide recién al abrir el paso 2 (`paso-seguimiento.tsx`).
export default function PasoSeguimientoCargado({ alta, contexto, zona }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const alMontarse = useRef({
    visible: alta.paso === 'seguimiento',
    conMotivos: Object.keys(alta.erroresDelSeguimiento).length > 0,
  })
  // Al montarse (la primera vez que se abre el paso, o al volver con motivos): el foco va al primer
  // motivo y, sin ninguno, al resumen. Las visitas siguientes las atiende el drawer.
  useEffect(() => {
    const raiz = contenedor.current
    if (!raiz || !alMontarse.current.visible) {
      return
    }
    const motivo = () => raiz.querySelector<HTMLElement>('[aria-invalid="true"]')
    const hayMotivos = alMontarse.current.conMotivos
    if (!hayMotivos || motivo()) {
      ;(motivo() ?? document.getElementById(`${ID_DEL_SEGUIMIENTO_DEL_ALTA}-titulo`))?.focus()
      return
    }
    // El motivo es del detalle y el editor llega aparte: se espera a que aparezca marcado.
    const observador = new MutationObserver(() => {
      const destino = motivo()
      if (destino) {
        destino.focus()
        observador.disconnect()
      }
    })
    observador.observe(raiz, { subtree: true, childList: true, attributes: true })
    const limite = setTimeout(() => {
      observador.disconnect()
    }, 5000)
    return () => {
      observador.disconnect()
      clearTimeout(limite)
    }
  }, [])
  return (
    <div ref={contenedor} className="grid gap-3">
      <CamposDelSeguimiento
        id={ID_DEL_SEGUIMIENTO_DEL_ALTA}
        valores={alta.seguimiento}
        errores={alta.erroresDelSeguimiento}
        cambiar={alta.cambiarSeguimiento}
        tipos={contexto.tiposDeSeguimiento}
        zona={zona}
        deshabilitado={alta.enCurso}
        original={null}
      />
    </div>
  )
}
