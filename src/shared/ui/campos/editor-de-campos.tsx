'use client'

import { PlusIcon } from 'lucide-react'
import { parseAsString, useQueryStates } from 'nuqs'
import { useState } from 'react'
import { agruparCampos, destinoDeMovimiento, type CampoBase } from '@/shared/lib/campos'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { CamposDesactivados } from './campos-desactivados'
import { GruposDeCampos } from './grupos-de-campos'
import { PanelDeCampo } from './panel-de-campo'
import type { ConfiguracionDeCampos, EdicionesDeCampos } from './tipos'

type Props<Campo extends CampoBase, Cambios extends object, Nuevo> = {
  // Todos, también los desactivados, en el orden del layout.
  campos: readonly Campo[]
  puedeGestionar: boolean
  configuracion: ConfiguracionDeCampos<Campo, Cambios, Nuevo>
  ediciones: EdicionesDeCampos<Cambios, Nuevo>
}

const CAMPO_NUEVO = 'nuevo'

function CabeceraDelEditor({
  titulo,
  puedeGestionar,
  alCrear,
}: {
  titulo: string
  puedeGestionar: boolean
  alCrear: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="campos-titulo" className="text-(length:--text-lg) font-medium text-(--color-ink)">
        {titulo}
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

// Una edición a la vez: cada una manda la versión que vio, y la siguiente espera a la nueva.
function useUnaEdicionALaVez() {
  const [ocupado, setOcupado] = useState(false)
  async function conBloqueo(trabajo: () => Promise<unknown>) {
    setOcupado(true)
    try {
      await trabajo()
    } finally {
      setOcupado(false)
    }
  }
  return { ocupado, conBloqueo }
}

// La pestaña «Campos»: el layout agrupado como lo ve el formulario. Cada bandera guarda sola;
// el resto de un campo se edita en su panel (`?campo=`).
export function EditorDeCampos<Campo extends CampoBase, Cambios extends object, Nuevo>(
  props: Props<Campo, Cambios, Nuevo>,
) {
  const { campos, puedeGestionar, configuracion, ediciones } = props
  const { textos } = configuracion
  const [{ campo: abierto }, setParametros] = useQueryStates(
    { campo: parseAsString },
    { shallow: false },
  )
  const { ocupado, conBloqueo } = useUnaEdicionALaVez()
  const grupos = agruparCampos(campos)
  const desactivados = campos.filter((campo) => !campo.activo)
  const cerrar = () => void setParametros({ campo: null })
  const campoAbierto =
    abierto === CAMPO_NUEVO ? CAMPO_NUEVO : (campos.find((campo) => campo.id === abierto) ?? null)
  const banderasDeFila = configuracion.banderas.filter((bandera) => bandera.enFila)

  return (
    <section aria-labelledby="campos-titulo" className="grid gap-4">
      <CabeceraDelEditor
        titulo={textos.titulo}
        puedeGestionar={puedeGestionar}
        alCrear={() => void setParametros({ campo: CAMPO_NUEVO })}
      />
      {puedeGestionar ? null : <Aviso>{textos.motivoSinPermiso}</Aviso>}
      {grupos.length === 0 ? (
        <EstadoVacio
          titulo={textos.vacioTitulo}
          descripcion={textos.vacioDescripcion}
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
          banderas={banderasDeFila}
          puedeGestionar={puedeGestionar}
          ocupado={ocupado || ediciones.enCurso}
          alAbrir={(id) => void setParametros({ campo: id })}
          alMover={(campo, sentido) => {
            const destino = destinoDeMovimiento(campos, campo.id, sentido)
            if (destino) {
              void conBloqueo(() => ediciones.mover(campo, destino.despuesDe))
            }
          }}
          alCambiarBandera={(campo, clave, valor) => {
            void conBloqueo(() =>
              ediciones.cambiarBandera(campo, configuracion.conBandera(clave, valor)),
            )
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
        todos={campos}
        puedeGestionar={puedeGestionar}
        configuracion={configuracion}
        ediciones={ediciones}
        alCerrar={cerrar}
      />
    </section>
  )
}
