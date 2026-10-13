'use client'

import { PlusIcon } from 'lucide-react'
import { parseAsString, useQueryStates } from 'nuqs'
import { useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { agruparCampos, destinoDeMovimiento, type CampoDeLayout } from '../../../entities/campo'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import type { TipoDeOrigen } from '../../../entities/origen'
import { useCampos } from '../hooks/use-campos'
import { CamposDesactivados } from './campos-desactivados'
import { GruposDeCampos } from './grupos-de-campos'
import { PanelDeCampo } from './panel-de-campo'

type Props = {
  origenId: string
  tipoDeOrigen: TipoDeOrigen
  // Todos, también los desactivados, en el orden del layout.
  campos: readonly CampoDeLayout[]
  puedeGestionar: boolean
}

const CAMPO_NUEVO = 'nuevo'

function CabeceraDelEditor({
  puedeGestionar,
  alCrear,
}: {
  puedeGestionar: boolean
  alCrear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="campos-titulo" className="text-(length:--text-lg) font-medium text-(--color-ink)">
        Layout de campos
      </h2>
      <Button
        variant="outline"
        className="h-11 md:h-8"
        disabled={!puedeGestionar}
        onClick={alCrear}
      >
        <PlusIcon aria-hidden />
        Nuevo campo
      </Button>
    </div>
  )
}

// La pestaña «Campos»: el layout agrupado como lo ve el formulario. Cada bandera guarda sola;
// el resto de un campo se edita en su panel (`?campo=`).
export function EditorDeCampos({ origenId, tipoDeOrigen, campos, puedeGestionar }: Props) {
  const ediciones = useCampos()
  const [{ campo: abierto }, setParametros] = useQueryStates(
    { campo: parseAsString },
    { shallow: false },
  )
  const [ocupado, setOcupado] = useState(false)
  const grupos = agruparCampos(campos)
  const desactivados = campos.filter((campo) => !campo.activo)
  const cerrar = () => void setParametros({ campo: null })
  const campoAbierto =
    abierto === CAMPO_NUEVO ? CAMPO_NUEVO : (campos.find((campo) => campo.id === abierto) ?? null)

  // Una edición a la vez: cada una manda la versión que vio, y la siguiente espera a la nueva.
  async function conBloqueo(trabajo: () => Promise<unknown>) {
    setOcupado(true)
    try {
      await trabajo()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section aria-labelledby="campos-titulo" className="grid gap-4">
      <CabeceraDelEditor
        puedeGestionar={puedeGestionar}
        alCrear={() => void setParametros({ campo: CAMPO_NUEVO })}
      />
      {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_ORIGENES}</Aviso>}
      {grupos.length === 0 ? (
        <EstadoVacio
          titulo="Este origen no tiene campos activos"
          descripcion="Sus vehículos sólo llevarán los datos comunes: marca, modelo, año, VIN, lote y precio."
          accion={
            puedeGestionar ? (
              <Button onClick={() => void setParametros({ campo: CAMPO_NUEVO })}>
                Agregar un campo
              </Button>
            ) : undefined
          }
        />
      ) : (
        <GruposDeCampos
          grupos={grupos}
          campos={campos}
          puedeGestionar={puedeGestionar}
          ocupado={ocupado || ediciones.enCurso}
          alAbrir={(id) => void setParametros({ campo: id })}
          alMover={(campo, sentido) => {
            const destino = destinoDeMovimiento(campos, campo.id, sentido)
            if (destino) {
              void conBloqueo(() => ediciones.mover(campo, destino.despuesDe))
            }
          }}
          alCambiarBandera={(campo, cambios) => {
            void conBloqueo(() => ediciones.cambiarBandera(campo, cambios))
          }}
        />
      )}
      {desactivados.length > 0 ? (
        <CamposDesactivados
          campos={desactivados}
          deshabilitado={!puedeGestionar || ocupado || ediciones.enCurso}
          alReactivar={(campo) => {
            void conBloqueo(() => ediciones.cambiarActivo(campo, true))
          }}
        />
      ) : null}
      <PanelDeCampo
        campo={campoAbierto}
        origenId={origenId}
        tipoDeOrigen={tipoDeOrigen}
        todos={campos}
        puedeGestionar={puedeGestionar}
        ediciones={ediciones}
        alCerrar={cerrar}
      />
    </section>
  )
}
