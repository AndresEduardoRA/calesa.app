'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { RUTAS } from '@/shared/lib/rutas'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { Drawer } from '@/shared/ui/drawer'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { avisar, avisarExito } from '@/shared/ui/toasts'
import { useConsultaDeMedios } from '@/shared/ui/use-consulta-de-medios'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { CLAVE_DE_TELEFONO, ETIQUETA_DEL_ANTERIOR } from '../../../entities/telefonos'
import type { LeadDeFicha } from '../../../entities/ficha'
import { telefonoDeFicha } from '../../../entities/ficha'
import { CampoTelefono } from '../../telefono/components/campo-telefono'
import { useCambiarTelefono } from '../hooks/use-cambiar-telefono'
import { SIN_NUMEROS } from '@/shared/lib/numeros-de-lead'
import { useNumeroEscrito } from '@/shared/ui/numero-de-lead'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'

// Desde acá el panel entra al costado; por debajo es una hoja inferior (con el teclado a la vista).
const COSTADO = '(min-width: 640px)'

type Props = {
  ficha: LeadDeFicha
  // Quien mira tiene el lead en su cartera y puede editarlo: sin esto el panel no se abre aunque la
  // URL lo pida.
  puedeCambiar: boolean
}

const idDelCampo = 'lead-cambiar-telefono'

function TelefonoActual({ ficha }: { ficha: LeadDeFicha }) {
  return (
    <p className="text-(length:--text-sm) text-(--color-ink-soft)">
      Teléfono actual:{' '}
      <span className="text-(--color-ink) tabular-nums">
        {telefonoDeFicha(ficha.telefono, ficha.telefonoCc)}
      </span>
      . Al cambiarlo, pasa a ser un teléfono extra con la etiqueta «{ETIQUETA_DEL_ANTERIOR}».
    </p>
  )
}

// Lo de adentro del panel. Se monta al abrirlo: cada apertura arranca vacía. Una versión nueva del
// lead (tras «Recargar») **no** lo reinicia: lo tipeado se conserva.
function Contenido({ ficha, alCerrar }: { ficha: LeadDeFicha; alCerrar: () => void }) {
  const idFormulario = useId()
  const router = useRouter()
  const formulario = useRef<HTMLFormElement>(null)
  const cambio = useCambiarTelefono({
    ficha,
    activo: true,
    alTerminar: (resultado) => {
      if (resultado === 'cambiado') {
        avisarExito(
          `Teléfono principal cambiado. El anterior quedó como «${ETIQUETA_DEL_ANTERIOR}».`,
        )
      } else {
        avisar('Ese ya era el teléfono principal.')
      }
      alCerrar()
    },
    // Sin acceso ya no hay nada que cambiar: el servidor vuelve a leer y muestra la pantalla de lo
    // que no se ve.
    alPerderElLead: () => {
      router.refresh()
    },
  })

  const hayErrores = Object.keys(cambio.errores).length > 0
  useEffect(() => {
    if (hayErrores) {
      enfocarPrimerError(formulario.current)
    }
  }, [cambio.errores, hayErrores])

  return (
    <div className="grid gap-4">
      <form
        id={idFormulario}
        ref={formulario}
        noValidate
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          void cambio.enviar()
        }}
      >
        <AvisosDelFormulario
          enLinea={cambio.enLinea}
          esperandoConexion={cambio.esperandoConexion}
          enCurso={cambio.enCurso}
          conflicto={cambio.conflicto}
          aviso={cambio.avisoGeneral}
          hrefVer={`${RUTAS.leads}/${ficha.id}`}
          detalleDelConflicto="No se guardó nada. Recargar trae el teléfono y la versión actuales, y conserva el número que escribiste."
          alReintentar={() => void cambio.enviar()}
          alRecargar={cambio.recargar}
        />
        <TelefonoActual ficha={ficha} />
        <CampoTelefono
          id={idDelCampo}
          etiqueta="Teléfono nuevo"
          valor={cambio.valor}
          error={cambio.errores[CLAVE_DE_TELEFONO.telefono]}
          telefono={cambio.telefono}
          deshabilitado={cambio.enCurso}
          alCambiar={cambio.cambiar}
          alSalir={cambio.revisar}
        />
        {ficha.telefonoCc === null ? (
          <p className="text-(length:--text-xs) text-(--color-ink-soft)">
            Escribe el número completo, con «+» y el código de país.
          </p>
        ) : null}
      </form>
      <PieDelPanel
        idFormulario={idFormulario}
        enCurso={cambio.enCurso}
        alCancelar={alCerrar}
        etiquetaDeGuardar="Cambiar teléfono"
        etiquetaEnCurso="Cambiando…"
        sinPuedeEnviar={!cambio.puedeEnviar}
      />
    </div>
  )
}

// El panel para cambiar el teléfono principal (`?panel=cambiar-telefono`). Sólo se abre para quien
// tiene el lead en su cartera: sin eso no hay botón y la URL no abre nada. Hoja inferior en el
// celular, con «Cambiar teléfono» siempre a la vista.
export function PanelDeTelefono({ ficha, puedeCambiar }: Props) {
  const panel = usePanelDeLead()
  const alCostado = useConsultaDeMedios(COSTADO)
  const abierto = puedeCambiar && panel.telefono.abierto
  // Mientras se cierra, el panel sigue mostrando lo que tenía.
  const aLaVista = useUltimo(abierto ? ficha : null)
  const mostrado = abierto ? ficha : aLaVista
  const numero = useNumeroEscrito(mostrado?.numeros ?? SIN_NUMEROS)
  return (
    <Drawer
      abierto={abierto}
      alCerrar={panel.telefono.cerrar}
      titulo="Cambiar teléfono principal"
      descripcion={
        mostrado ? [mostrado.nombre, numero.principal].filter(Boolean).join(' · ') : undefined
      }
      lado={alCostado ? 'right' : 'bottom'}
    >
      {mostrado ? <Contenido ficha={mostrado} alCerrar={panel.telefono.cerrar} /> : null}
    </Drawer>
  )
}
