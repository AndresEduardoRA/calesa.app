'use client'

import type { RefObject } from 'react'
import { Modal } from '@/shared/ui/modal'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { SeccionDeHoja as Seccion } from '../../../entities/hoja'
import type { AyudaDeLaHoja } from '../hooks/use-ayuda-de-la-hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import { LugarDeAyuda } from './lugar-de-ayuda'
import { SeccionDeHoja } from './seccion-de-hoja'

type Props = {
  abierto: boolean
  alCerrar: () => void
  secciones: Seccion[]
  contexto: ContextoDeHoja
  acciones: AccionesDeHoja
  // Mientras guarda el modal no se cierra y sus celdas no se tocan (lo guardado reemplaza a la hoja).
  guardando: boolean
  // La ayuda de una celda de «Avanzado» se abre encima del modal, dentro de él (un modal no abre otro: es un panel).
  ayuda: AyudaDeLaHoja
  // El botón «Avanzado»: el foco vuelve a él al cerrar, también si el modal se abrió por la URL.
  botonDeAvanzado: RefObject<HTMLButtonElement | null>
}

// Marca del cuerpo del modal: el guardado busca ahí la celda que quedó abierta (el modal va en un portal, fuera de la raíz de la hoja).
export const CUERPO_DE_AVANZADO = '[data-avanzado-cuerpo]'

// El primer valor que se puede tipear; si no hay ninguno, el primero que haya.
function primerValor(): HTMLElement | true {
  const valores = document.querySelectorAll<HTMLElement>(`${CUERPO_DE_AVANZADO} [data-parada="0"]`)
  return (
    [...valores].find((v) => !v.hasAttribute('disabled') && v.ariaDisabled !== 'true') ??
    valores[0] ??
    true
  )
}

// «Avanzado» (paso 4.13-4a): las secciones avanzadas de la hoja en un modal con su URL (`?panel=avanzado`), con las mismas celdas, acciones y recálculo que la hoja. El
// diálogo se monta recién al abrirse (`ModalDeAvanzadoDiferido`).
export function ModalDeAvanzado({
  abierto,
  alCerrar,
  secciones,
  contexto,
  acciones,
  guardando,
  ayuda,
  botonDeAvanzado,
}: Props) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Avanzado"
      ancho="amplio"
      bloqueado={guardando}
      focoInicial={primerValor}
      focoAlCerrar={() => botonDeAvanzado.current ?? true}
    >
      <div data-avanzado-cuerpo="" inert={guardando} className="grid min-w-0 gap-4">
        {secciones.map((seccion) => (
          <SeccionDeHoja
            key={seccion.id}
            seccion={seccion}
            contexto={contexto}
            acciones={acciones}
          />
        ))}
      </div>
      <LugarDeAyuda secciones={secciones} contexto={contexto} ayuda={ayuda} />
    </Modal>
  )
}
