'use client'

import { useId, useState } from 'react'
import { plataformasConocidas } from '@/shared/lib/apibara'
import { enfocarPrimerError, errorDeCampo } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { MOTIVO_SIN_PERMISO_ORIGENES, MOTIVO_TIPO_NO_CAMBIA } from '../../../entities/motivos'
import {
  ETIQUETA_DE_TIPO_DE_ORIGEN,
  huellaDelOrigen,
  type OrigenConUso,
} from '../../../entities/origen'
import { useOrigenes } from '../hooks/use-origenes'
import { useValoresDeOrigen } from '../hooks/use-valores-de-origen'
import { CamposDeOrigen } from './campos-de-origen'
import { EstadoDelOrigen } from './estado-del-origen'

type Props = { origen: OrigenConUso; puedeGestionar: boolean }

type PropsDelFormulario = Props & { idFormulario: string }

// Lo que no se edita: el tipo y la clave interna salen de cuando se creó el origen.
function FichaDelOrigen({ origen }: { origen: OrigenConUso }) {
  return (
    <dl className="grid gap-1 text-(length:--text-sm)">
      <div className="flex flex-wrap gap-x-2">
        <dt className="text-(--color-ink-soft)">Tipo</dt>
        <dd className="font-medium text-(--color-ink)">
          {ETIQUETA_DE_TIPO_DE_ORIGEN[origen.tipo]}
        </dd>
      </div>
      <div className="flex flex-wrap gap-x-2">
        <dt className="text-(--color-ink-soft)">Clave interna</dt>
        <dd className="font-mono text-(--color-ink)">{origen.clave}</dd>
      </div>
      <p className="text-(--color-ink-faint)">{MOTIVO_TIPO_NO_CAMBIA}</p>
    </dl>
  )
}

function Formulario({ origen, puedeGestionar, idFormulario }: PropsDelFormulario) {
  const ediciones = useOrigenes()
  const [errorDeNombre, setErrorDeNombre] = useState<string | undefined>(undefined)
  const { valores, cambiar } = useValoresDeOrigen(
    {
      nombre: origen.nombre,
      sustantivo: origen.sustantivo,
      genero: origen.genero,
      color: origen.color,
      plataformas: plataformasConocidas(origen.apibaraPlataformas),
    },
    // El género guardado es una decisión: no se pisa al retocar el sustantivo.
    true,
  )
  const errores = ediciones.errores.guardar

  async function guardar(elemento: HTMLFormElement) {
    setErrorDeNombre(undefined)
    const resultado = await ediciones.guardar(
      {
        id: origen.id,
        actualizadoEnEsperado: origen.actualizadoEn,
        nombre: valores.nombre,
        sustantivo: valores.sustantivo,
        genero: valores.genero,
        color: valores.color,
        ...(origen.tipo === 'subasta' ? { plataformas: valores.plataformas } : {}),
      },
      `Origen «${valores.nombre.trim()}» guardado`,
    )
    if (!resultado.ok) {
      if (resultado.error.codigo === 'duplicado') {
        setErrorDeNombre(resultado.error.mensaje)
      }
      enfocarPrimerError(elemento)
    }
  }

  return (
    <form
      id={idFormulario}
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar(evento.currentTarget)
      }}
    >
      <fieldset disabled={!puedeGestionar} className="grid min-w-0 gap-4">
        <legend className="sr-only">Datos de {origen.nombre}</legend>
        {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_ORIGENES}</Aviso>}
        <FichaDelOrigen origen={origen} />
        <CamposDeOrigen
          valores={valores}
          alCambiar={(parcial) => {
            if (parcial.nombre !== undefined) {
              setErrorDeNombre(undefined)
            }
            cambiar(parcial)
          }}
          esDeSubasta={origen.tipo === 'subasta'}
          errores={{
            nombre: errorDeNombre ?? errorDeCampo(errores, 'nombre'),
            sustantivo: errorDeCampo(errores, 'sustantivo'),
            color: errorDeCampo(errores, 'color'),
            plataformas: errorDeCampo(errores, 'plataformas'),
          }}
          deshabilitado={!puedeGestionar}
        />
      </fieldset>
      {puedeGestionar ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={ediciones.enCurso}>
            {ediciones.enCurso ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      ) : null}
    </form>
  )
}

// La pestaña «Datos». El formulario lleva de `key` lo que él muestra (no la versión): desactivar
// el origen toca la misma fila y no le borra lo tipeado; guardar otra persona sí lo reinicia.
export function DatosDelOrigen({ origen, puedeGestionar }: Props) {
  const idFormulario = useId()
  return (
    <div className="grid gap-6">
      <Formulario
        key={huellaDelOrigen(origen)}
        origen={origen}
        puedeGestionar={puedeGestionar}
        idFormulario={idFormulario}
      />
      <EstadoDelOrigen origen={origen} puedeGestionar={puedeGestionar} />
    </div>
  )
}
