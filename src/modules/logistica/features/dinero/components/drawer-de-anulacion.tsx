'use client'

import { useEffect, useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { Label } from '@/shared/ui/label'
import { Monto } from '@/shared/ui/monto'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { Textarea } from '@/shared/ui/textarea'
import { MOTIVO_MAXIMO } from '../../../entities/dinero/anulacion-de-pago'
import { tituloDeAnularPago, type Pago } from '../../../entities/dinero/pago'
import { useAmbitoDePago } from '../hooks/ambito-de-pago'
import { useAnulacionDePago } from '../hooks/use-anulacion-de-pago'

type Props = {
  abierto: boolean
  alCerrar: () => void
  unidadId: string
  // El que se anula; el último que se vio mientras el drawer se va.
  pago: Pago | null
  apertura: number
}

function Formulario({ alCerrar, unidadId, pago }: Omit<Props, 'abierto' | 'apertura'>) {
  const idFormulario = useId()
  const idMotivo = `${idFormulario}-motivo`
  const formulario = useRef<HTMLFormElement>(null)
  const a = useAnulacionDePago({ unidadId, pago, alCerrar })
  // El margen de un proyecto de repuestos (`repuestos_proyecto_margen`) no cuenta sus pagos.
  const proyecto = useAmbitoDePago() === 'proyecto'
  // Con un motivo escrito, la acción de un aviso que sale de la pantalla pregunta en el pie; descartar lo tira.
  useCambiosSinGuardar(a.hayCambios, () => {
    a.escribir('')
  })
  useEffect(() => {
    if (a.errorDelMotivo !== null) {
      enfocarPrimerError(formulario.current)
    }
  }, [a.errorDelMotivo])
  return (
    <div className="grid gap-4">
      <form
        id={idFormulario}
        ref={formulario}
        noValidate
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          void a.enviar()
        }}
      >
        <p className="text-(length:--text-sm)">
          {proyecto
            ? 'El pago deja de contar como pago del cliente. No se puede deshacer.'
            : 'El pago deja de contar en el margen. No se puede deshacer.'}
        </p>
        {pago ? (
          <p className="text-(length:--text-sm)">
            Monto: <Monto valor={pago.monto} moneda={pago.moneda} />
          </p>
        ) : null}
        {a.aviso ? (
          <Aviso tono="peligro">
            <p>{a.aviso}</p>
          </Aviso>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor={idMotivo}>Motivo</Label>
          <Textarea
            id={idMotivo}
            name="motivo"
            value={a.motivo}
            maxLength={MOTIVO_MAXIMO + 100}
            aria-invalid={a.errorDelMotivo ? true : undefined}
            aria-describedby={a.errorDelMotivo ? `${idMotivo}-error` : undefined}
            disabled={a.enCurso}
            onChange={(evento) => {
              a.escribir(evento.target.value)
            }}
          />
          {a.errorDelMotivo ? (
            <p
              id={`${idMotivo}-error`}
              className="text-(length:--text-sm) text-(--color-peligro-ink)"
            >
              {a.errorDelMotivo}
            </p>
          ) : null}
        </div>
      </form>
      <PieDelPanel
        idFormulario={idFormulario}
        enCurso={a.enCurso}
        alCancelar={alCerrar}
        etiquetaDeGuardar="Anular pago"
        etiquetaEnCurso="Anulando…"
      />
    </div>
  )
}

// Anular un pago confirmado (`?panel=anular-pago&pago=<id>`): pide un motivo de 1 a 500 letras, que queda con el sello de la anulación. El diálogo de confirmar no tiene campo de texto, por eso es un
// drawer. Cada apertura empieza de cero (`key`).
export function DrawerDeAnulacion({ abierto, alCerrar, unidadId, pago, apertura }: Props) {
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={pago ? tituloDeAnularPago(pago) : 'Anular el pago'}
      descripcion="Un pago confirmado no se edita: se anula con un motivo."
      focoAlCerrar={focoDeQuienAbrio}
    >
      <Formulario
        key={`${String(apertura)}-${pago?.id ?? ''}-${pago?.actualizadoEn ?? ''}`}
        alCerrar={alCerrar}
        unidadId={unidadId}
        pago={pago}
      />
    </Drawer>
  )
}
