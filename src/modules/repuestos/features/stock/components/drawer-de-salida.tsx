'use client'

import { useEffect, useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { formatearNumero } from '@/shared/lib/formato'
import { Aviso } from '@/shared/ui/aviso'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { FilaDeStock } from '../../../entities/stock/listado'
import { TEXTO_DEL_MOTIVO } from '../../../entities/stock/motivos'
import { useSalidaDeStock, type MotivoDeSalida } from '../hooks/use-salida-de-stock'
import { CampoDeCantidad, CampoDeNota } from './campos-de-stock'

type Props = {
  abierto: boolean
  alCerrar: () => void
  apertura: number
  motivo: MotivoDeSalida
  // La fila vigente de la página (la última que se vio, mientras el panel se va).
  fila: FilaDeStock | null
  focoAlCerrar: () => HTMLElement | boolean
}

const BOTON: Record<MotivoDeSalida, { guardar: string; enCurso: string }> = {
  vendido: { guardar: 'Vender suelto', enCurso: 'Vendiendo…' },
  devuelto: { guardar: 'Devolver', enCurso: 'Devolviendo…' },
}

function Formulario({
  fila,
  motivo,
  alCerrar,
}: {
  fila: FilaDeStock
  motivo: MotivoDeSalida
  alCerrar: () => void
}) {
  const id = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const f = useSalidaDeStock({ fila, motivo, alTerminar: alCerrar })
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
        <CampoDeCantidad
          id={`${id}-cantidad`}
          valor={f.valores.cantidad}
          error={f.errores.cantidad}
          disabled={f.enCurso}
          alEscribir={(texto) => {
            f.escribir('cantidad', texto)
          }}
        />
        <CampoDeNota
          id={`${id}-nota`}
          valor={f.valores.nota}
          error={f.errores.nota}
          disabled={f.enCurso}
          alEscribir={(texto) => {
            f.escribir('nota', texto)
          }}
        />
      </form>
      <PieDelPanel
        idFormulario={id}
        enCurso={f.enCurso}
        alCancelar={alCerrar}
        etiquetaDeGuardar={BOTON[motivo].guardar}
        etiquetaEnCurso={BOTON[motivo].enCurso}
      />
    </div>
  )
}

// «Vender suelto» o «Devolver al proveedor» de un ítem en stock (`?panel=vender-stock|devolver-stock&item=<id>`, 8.10-3, C12): cantidad y nota. Se queda montado
// cerrado y cada apertura remonta el formulario con su `key`.
export function DrawerDeSalida({ abierto, alCerrar, apertura, motivo, fila, focoAlCerrar }: Props) {
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={fila ? `${TEXTO_DEL_MOTIVO[motivo]} «${fila.descripcion}»` : TEXTO_DEL_MOTIVO[motivo]}
      descripcion={fila ? `Hay ${formatearNumero(fila.stockCantidad)} en stock.` : undefined}
      focoAlCerrar={focoAlCerrar}
    >
      {fila ? <Formulario key={apertura} fila={fila} motivo={motivo} alCerrar={alCerrar} /> : null}
    </Drawer>
  )
}
