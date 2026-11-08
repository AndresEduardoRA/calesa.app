'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { Textarea } from '@/shared/ui/textarea'
import { avisarExito } from '@/shared/ui/toasts'
import { useApertura } from '@/shared/ui/use-apertura'
import { useEnvioDeModal } from '@/shared/ui/use-envio-de-modal'
import { esquemaDelMotivo, MOTIVO_MAXIMO } from '../../../entities/comentarios/moderacion-lectura'
import { reportar } from '../actions/reportar'
import { useRetiroDelReporte } from '../hooks/use-retiro-del-reporte'

type Props = {
  abierto: boolean
  alCerrar: () => void
  cotizacionId: string
  numero: number
  miMotivo: string | null
}

const IDS = { formulario: 'reportar-cotizacion', motivo: 'reportar-cotizacion-motivo' } as const
const NO_SE_ENVIO = 'No se pudo enviar el reporte.'

const AVISO_DEL_REPORTE = {
  reportada: 'Reporte enviado.',
  motivo_cambiado: 'Motivo cambiado.',
  sin_cambios: 'Motivo cambiado.',
} as const

// «Reportar la cotización n.º N» (`?panel=reportar`, 4.27-4): el motivo, de 1 a 500 caracteres. Si ya la reportó, lo trae escrito para cambiarlo y ofrece «Retirar mi
// reporte» (reversible: el aviso ofrece «Deshacer»). Cada apertura empieza con lo que dice la página.
export function ModalDeReportar(props: Props) {
  const apertura = useApertura(props.abierto)
  return <FormularioDeReportar key={apertura} {...props} />
}

function FormularioDeReportar({ abierto, alCerrar, cotizacionId, numero, miMotivo }: Props) {
  const router = useRouter()
  const [motivo, setMotivo] = useState(miMotivo ?? '')
  const retiro = useRetiroDelReporte(cotizacionId, alCerrar)
  const formulario = useEnvioDeModal({
    abierto,
    hayCambios: motivo.trim() !== (miMotivo ?? '').trim(),
    validar: () => {
      const leido = esquemaDelMotivo.safeParse(motivo)
      return leido.success ? null : { motivo: leido.error.issues[0]?.message ?? '' }
    },
    pedir: () => enviarAccion(reportar({ cotizacionId, motivo }), NO_SE_ENVIO),
    alGuardar: (dato) => {
      alCerrar()
      avisarExito(AVISO_DEL_REPORTE[dato.resultado])
      router.refresh()
    },
  })
  const ocupado = formulario.enCurso || retiro.retirando
  return (
    <ModalDeFormulario
      id={IDS.formulario}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Reportar la cotización n.º ${String(numero)}`}
      descripcion="Quien modera verá tu motivo y decidirá. No se lo decimos al autor."
      focoInicial={() => document.getElementById(IDS.motivo)}
      formulario={{ ...formulario, enCurso: ocupado }}
      guardar={
        miMotivo === null
          ? { etiqueta: 'Enviar el reporte', enCurso: 'Enviando…' }
          : { etiqueta: 'Cambiar el motivo', enCurso: 'Cambiando…' }
      }
    >
      <CampoDelMotivo
        motivo={motivo}
        error={formulario.errores['motivo']}
        deshabilitado={ocupado}
        alCambiar={(valor) => {
          setMotivo(valor)
          formulario.quitarMotivo('motivo')
        }}
      />
      {miMotivo === null ? null : (
        <div>
          <Button
            type="button"
            variant="link"
            className="min-h-11 px-0 md:min-h-9"
            disabled={ocupado}
            onClick={() => {
              void retiro.retirar(miMotivo)
            }}
          >
            {retiro.retirando ? 'Retirando…' : 'Retirar mi reporte'}
          </Button>
        </div>
      )}
    </ModalDeFormulario>
  )
}

// «¿Qué está mal?» con su contador (`n/500`) o, si no pasa, el motivo en su lugar.
function CampoDelMotivo({
  motivo,
  error,
  deshabilitado,
  alCambiar,
}: {
  motivo: string
  error: string | undefined
  deshabilitado: boolean
  alCambiar: (valor: string) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={IDS.motivo}>¿Qué está mal?</Label>
      <Textarea
        id={IDS.motivo}
        value={motivo}
        rows={4}
        maxLength={MOTIVO_MAXIMO + 20}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${IDS.motivo}-ayuda`}
        disabled={deshabilitado}
        onChange={(evento) => {
          alCambiar(evento.target.value)
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
  )
}
