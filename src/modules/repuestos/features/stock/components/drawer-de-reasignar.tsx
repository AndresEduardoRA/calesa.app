'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { formatearNumero } from '@/shared/lib/formato'
import { Aviso } from '@/shared/ui/aviso'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { FilaDeStock } from '../../../entities/stock/listado'
import { useReasignarStock, type ProyectoElegido } from '../hooks/use-reasignar-stock'
import { CampoDeCantidad } from './campos-de-stock'

// El campo «Proyecto destino»: lo compone `src/app` con el buscador de proyectos (el área `stock` no importa `proyectos`). Encaja por forma con su buscador.
export type CampoDeProyectoDestino = (props: {
  valor: ProyectoElegido | null
  alElegir: (elegido: ProyectoElegido | null) => void
  etiqueta: string
  error?: string
  disabled?: boolean
  excluir: string
}) => ReactNode

type Props = {
  abierto: boolean
  alCerrar: () => void
  apertura: number
  fila: FilaDeStock | null
  campoDeProyecto: CampoDeProyectoDestino
  focoAlCerrar: () => HTMLElement | boolean
}

type PropsDelFormulario = {
  fila: FilaDeStock
  campoDeProyecto: CampoDeProyectoDestino
  alCerrar: () => void
}

function Formulario({ fila, campoDeProyecto, alCerrar }: PropsDelFormulario) {
  const id = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const f = useReasignarStock({ fila, alTerminar: alCerrar })
  useCambiosSinGuardar(f.hayCambios, f.vaciar)
  const hayErrores = Object.values(f.errores).some(Boolean)
  useEffect(() => {
    if (hayErrores) enfocarPrimerError(formulario.current)
  }, [f.errores, hayErrores])
  return (
    <div className="grid gap-3">
      <form
        id={id}
        ref={formulario}
        noValidate
        className="grid grid-cols-[minmax(0,1fr)] gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          void f.enviar()
        }}
      >
        {f.aviso ? (
          <Aviso tono="peligro">
            <p>{f.aviso}</p>
          </Aviso>
        ) : null}
        {campoDeProyecto({
          valor: f.destino,
          alElegir: f.elegir,
          etiqueta: 'Proyecto destino',
          ...(f.errores.proyecto ? { error: f.errores.proyecto } : {}),
          disabled: f.enCurso,
          excluir: fila.proyectoId,
        })}
        <CampoDeCantidad
          id={`${id}-cantidad`}
          valor={f.cantidad}
          error={f.errores.cantidad}
          disabled={f.enCurso}
          alEscribir={f.escribirCantidad}
        />
      </form>
      <PieDelPanel
        idFormulario={id}
        enCurso={f.enCurso}
        alCancelar={alCerrar}
        etiquetaDeGuardar="Reasignar"
        etiquetaEnCurso="Reasignando…"
      />
    </div>
  )
}

// «Reasignar a un proyecto» de un ítem en stock (`?panel=reasignar-stock&item=<id>`, 8.10-3, C13): proyecto destino y cantidad; todo o nada en la base. Se queda montado
// cerrado y cada apertura remonta el formulario (y su id de intento) con su `key`.
export function DrawerDeReasignar({
  abierto,
  alCerrar,
  apertura,
  fila,
  campoDeProyecto,
  focoAlCerrar,
}: Props) {
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={fila ? `Reasignar «${fila.descripcion}»` : 'Reasignar'}
      descripcion={
        fila
          ? `Del proyecto #${String(fila.proyectoNumero)}. Hay ${formatearNumero(fila.stockCantidad)} en stock.`
          : undefined
      }
      focoAlCerrar={focoAlCerrar}
    >
      {fila ? (
        <Formulario
          key={apertura}
          fila={fila}
          campoDeProyecto={campoDeProyecto}
          alCerrar={alCerrar}
        />
      ) : null}
    </Drawer>
  )
}
