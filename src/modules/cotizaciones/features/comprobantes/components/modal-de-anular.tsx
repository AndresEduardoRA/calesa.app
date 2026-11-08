'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Label } from '@/shared/ui/label'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { Textarea } from '@/shared/ui/textarea'
import { avisarExito } from '@/shared/ui/toasts'
import { useApertura } from '@/shared/ui/use-apertura'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { esquemaDelMotivo, MOTIVO_MAXIMO } from '../../../entities/comprobantes/motivo'
import { anularComprobante } from '../actions/anular'

type Props = {
  abierto: boolean
  alCerrar: () => void
  comprobanteId: string
  // «S-N».
  numero: string
  focoAlCerrar: () => HTMLElement | boolean
}

const IDS = { formulario: 'anular-comprobante', motivo: 'anular-comprobante-motivo' } as const
const NO_SE_ANULO = 'No se pudo anular el comprobante.'

// «Anular el comprobante S-N» (`?panel=anular-comprobante`, 4.26-2): el motivo, de 1 a 500 caracteres. Si la base lo rechaza (ya estaba anulado, sin permiso)
// lo dice adentro y lo tipeado queda. Cada apertura empieza vacía.
export function ModalDeAnular(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeAnular key={apertura} {...props} />
}

function FormularioDeAnular({ abierto, alCerrar, comprobanteId, numero, focoAlCerrar }: Props) {
  const router = useRouter()
  const [motivo, setMotivo] = useState('')
  const formulario = useEnvioDeModal({
    abierto,
    hayCambios: motivo.trim() !== '',
    validar: () => {
      const leido = esquemaDelMotivo.safeParse(motivo)
      return leido.success ? null : { motivo: leido.error.issues[0]?.message ?? '' }
    },
    pedir: () => enviarAccion(anularComprobante({ comprobanteId, motivo }), NO_SE_ANULO),
    alGuardar: () => {
      alCerrar()
      avisarExito(`Anulaste el comprobante ${numero}.`)
      router.refresh()
    },
  })
  const error = formulario.errores['motivo']
  return (
    <ModalDeFormulario
      id={IDS.formulario}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Anular el comprobante ${numero}`}
      descripcion="Queda en la cotización como anulado y su número no se vuelve a usar. Después puedes emitir otro."
      focoInicial={() => document.getElementById(IDS.motivo)}
      focoAlCerrar={focoAlCerrar}
      formulario={formulario}
      guardar={{ etiqueta: 'Anular comprobante', enCurso: 'Anulando…' }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={IDS.motivo}>Motivo</Label>
        <Textarea
          id={IDS.motivo}
          value={motivo}
          rows={3}
          maxLength={MOTIVO_MAXIMO + 20}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${IDS.motivo}-ayuda`}
          disabled={formulario.enCurso}
          onChange={(evento) => {
            setMotivo(evento.target.value)
            formulario.quitarMotivo('motivo')
          }}
        />
        <p
          id={`${IDS.motivo}-ayuda`}
          className={
            error
              ? 'text-(length:--text-sm) text-(--color-peligro-ink)'
              : 'text-(length:--text-sm) text-(--color-ink-soft)'
          }
        >
          {error ?? `${String(motivo.trim().length)}/${String(MOTIVO_MAXIMO)}`}
        </p>
      </div>
    </ModalDeFormulario>
  )
}
