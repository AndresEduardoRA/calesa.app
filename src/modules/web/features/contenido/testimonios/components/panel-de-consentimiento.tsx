'use client'

import { useId } from 'react'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import type { Testimonio } from '../../../../entities/contenido/testimonios'
import { useFormularioDeConsentimiento } from '../hooks/use-formulario-de-consentimiento'
import { CamposDeConsentimiento } from './campos-de-consentimiento'

type Props = {
  abierto: boolean
  // El testimonio al que se le registra el consentimiento.
  testimonio: Testimonio
  alGuardar: () => void
  alCerrar: () => void
}

const recortado = (texto: string) => (texto.length > 60 ? `${texto.slice(0, 59)}…` : texto)

// «Registrar consentimiento» (`?panel=consentimiento-testimonio&testimonio=<id>`): por qué canal lo dio el cliente y qué datos autorizó. Cada casilla sólo
// se puede encender si el testimonio tiene ese dato. Quien lo monta le da una `key` por apertura.
export function PanelDeConsentimiento({
  abierto,
  testimonio: alAbrir,
  alGuardar,
  alCerrar,
}: Props) {
  const idDelFormulario = useId()
  const f = useFormularioDeConsentimiento({ idDelFormulario, testimonio: alAbrir, alGuardar })
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Registrar consentimiento"
      descripcion={`Testimonio de ${recortado(f.testimonio.cliente)}`}
      pie={
        <PieDelPanel
          idFormulario={idDelFormulario}
          enCurso={f.enCurso}
          alCancelar={alCerrar}
          etiquetaDeGuardar="Registrar consentimiento"
          sinPuedeEnviar={f.conflicto !== null}
        />
      }
    >
      <CambiosSinGuardar hayCambios={f.hayCambios} />
      <form
        id={idDelFormulario}
        className="grid gap-4"
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault()
          void f.enviar()
        }}
      >
        {f.conflicto ? <AvisoDeConflicto mensaje={f.conflicto} alRecargar={f.recargar} /> : null}
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          El nombre y el texto quedan autorizados. Quedan registrados quién y cuándo.
        </p>
        <CamposDeConsentimiento formulario={f} />
      </form>
    </Drawer>
  )
}
