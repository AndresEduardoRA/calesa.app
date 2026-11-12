'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef } from 'react'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { textoDelPieDelGrupo } from '../../../entities/transporte/edicion-del-grupo'
import type { GrupoLeido } from '../../../entities/transporte/grupos'
import type { ElementoDeOferta } from '../../../entities/transporte/oferta'
import { useFormularioDelGrupo } from '../hooks/use-formulario-del-grupo'
import { BloquesDelGrupo } from './bloques-del-grupo'

type Props = {
  grupo: GrupoLeido
  navieras: readonly ElementoDeOferta[]
  puertos: readonly ElementoDeOferta[]
  // Se aplicó (clave nueva) o se canceló (la de ahora): vuelve al resumen.
  alVolver: (clave: string) => void
}

// El formulario de «Editar grupo» (6.08-4): tres bloques abiertos, el pie «Se aplicará a las N unidades.» y los avisos de conflicto. Lo que se cambia llega a todas las unidades o a ninguna.
export function FormularioDelGrupo({ grupo, navieras, puertos, alVolver }: Props) {
  const idFormulario = useId()
  const formulario = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const f = useFormularioDelGrupo({ grupo, formulario, alAplicar: alVolver })
  useCambiosSinGuardar(f.hayCambios, f.descartar)
  const hayErrores = Object.keys(f.errores).length > 0
  useEffect(() => {
    if (hayErrores) {
      enfocarPrimerError(formulario.current)
    }
  }, [f.errores, hayErrores])
  const { comunes } = f
  const campos = {
    prefijo: 'grupo',
    valores: f.valores,
    varios: comunes.varios,
    errores: f.errores,
    escribir: f.escribir,
    apagado: f.enCurso,
  }
  return (
    <div className="grid gap-4">
      <form
        id={idFormulario}
        ref={formulario}
        noValidate
        className="grid gap-3"
        data-formulario="editar-grupo"
        onSubmit={(evento) => {
          evento.preventDefault()
          f.guardar()
        }}
      >
        <AvisosDelFormulario
          enLinea
          esperandoConexion={false}
          enCurso={f.enCurso}
          conflicto={f.conflicto}
          aviso={f.error}
          detalleDelConflicto="No se cambió ninguna unidad. Recargar trae la versión nueva y conserva lo que escribiste."
          alReintentar={f.guardar}
          alRecargar={() => {
            // El grupo nuevo llega como `grupo` (con las versiones nuevas); lo tipeado se queda.
            router.refresh()
          }}
        />
        <BloquesDelGrupo {...campos} navieras={navieras} puertos={puertos} />
        <p className="text-(length:--text-sm) text-(--color-ink-soft)" data-pie-del-grupo="">
          {textoDelPieDelGrupo(grupo.unidades.length)}
        </p>
      </form>
      <PieDelPanel
        idFormulario={idFormulario}
        enCurso={f.enCurso}
        alCancelar={() => {
          alVolver(grupo.clave)
        }}
        sinPuedeEnviar={!f.hayCambios}
      />
    </div>
  )
}
