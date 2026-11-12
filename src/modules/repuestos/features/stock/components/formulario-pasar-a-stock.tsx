'use client'

import { useEffect, useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { Textarea } from '@/shared/ui/textarea'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { MAXIMO_DE_NOTA_DE_STOCK } from '../../../entities/stock/reglas'
import { usePasarAStock } from '../hooks/use-pasar-a-stock'

type Props = {
  item: FilaDeItem
  cambiarFila: (id: string, cambio: (fila: FilaDeItem) => FilaDeItem) => void
  alPasar: () => void
  alCancelar: () => void
}

function Error({ id, texto }: { id: string; texto: string | undefined }) {
  return texto ? (
    <p id={id} className="text-(length:--text-sm) text-(--color-peligro-ink)">
      {texto}
    </p>
  ) : null
}

// El formulario «Pasar a stock» del panel del ítem (8.10-2, C12): cantidad y nota. Con algo escrito, la acción de un aviso que sale de la pantalla pregunta en el pie.
export function FormularioPasarAStock({ item, cambiarFila, alPasar, alCancelar }: Props) {
  const id = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const f = usePasarAStock({ item, cambiarFila, alPasar })
  useCambiosSinGuardar(f.hayCambios, f.vaciar)
  const hayErrores = Object.values(f.errores).some(Boolean)
  useEffect(() => {
    if (hayErrores) {
      enfocarPrimerError(formulario.current)
    }
  }, [f.errores, hayErrores])
  const idCantidad = `${id}-cantidad`
  const idNota = `${id}-nota`
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
        <div className="grid gap-1.5">
          <Label htmlFor={idCantidad}>Cantidad</Label>
          <Input
            id={idCantidad}
            name="cantidad"
            inputMode="numeric"
            autoComplete="off"
            value={f.valores.cantidad}
            aria-invalid={f.errores.cantidad ? true : undefined}
            aria-describedby={f.errores.cantidad ? `${idCantidad}-error` : undefined}
            disabled={f.enCurso}
            className="max-w-40 tabular-nums"
            onChange={(evento) => {
              f.escribir('cantidad', evento.target.value)
            }}
          />
          <Error id={`${idCantidad}-error`} texto={f.errores.cantidad} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={idNota}>Nota</Label>
          <Textarea
            id={idNota}
            name="nota"
            value={f.valores.nota}
            maxLength={MAXIMO_DE_NOTA_DE_STOCK + 100}
            aria-invalid={f.errores.nota ? true : undefined}
            aria-describedby={f.errores.nota ? `${idNota}-error` : undefined}
            disabled={f.enCurso}
            onChange={(evento) => {
              f.escribir('nota', evento.target.value)
            }}
          />
          <Error id={`${idNota}-error`} texto={f.errores.nota} />
        </div>
      </form>
      <PieDelPanel
        idFormulario={id}
        enCurso={f.enCurso}
        alCancelar={alCancelar}
        etiquetaDeGuardar="Pasar a stock"
        etiquetaEnCurso="Pasando…"
      />
    </div>
  )
}
