'use client'

import { useMemo, type ComponentType } from 'react'
import { Button } from '@/shared/ui/button'
import { avisosDeTonos } from '../../../entities/plantilla/avisos-de-tonos'
import type { Plantilla } from '../../../entities/plantilla/forma-de-plantilla'
import { filasDelEditor, type FilasDelEditor } from '../../../entities/plantilla/filas-del-editor'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'
import type { PropsDeLaVistaPreviaDeLaPlantilla } from '../../../entities/vista-previa-de-la-plantilla'
import { useEditorDeLaPlantilla } from '../hooks/use-editor-de-la-plantilla'
import { useGuardarLaPlantilla } from '../hooks/use-guardar-la-plantilla'
import { useMotivosDelEditor } from '../hooks/use-motivos-del-editor'
import { AvisosDelEditor } from './avisos-del-editor'
import { BotonesDeLaPlantilla } from './botones-de-la-plantilla'
import { CuerpoDelEditor } from './cuerpo-del-editor'
import { EncabezadoDelEditor } from './encabezado-del-editor'
import { VistaPreviaDelEditor } from './vista-previa-del-editor'

const CLASE_DEL_FORMULARIO = 'grid min-w-0 gap-4'
// Desde `xl` la vista previa va en una segunda columna (4.19-4).
const CLASE_CON_VISTA_PREVIA = `${CLASE_DEL_FORMULARIO} xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]`

function avisosDeLosTonos(
  grupos: Plantilla['grupos'],
  filas: FilasDelEditor,
  tonos: PropsDelEditor['tonos'],
) {
  const nombres = new Map(filas.grupos.map((g) => [g.id, g.etiqueta]))
  return avisosDeTonos(
    grupos,
    tonos.map((t) => t.clave),
    (g) => nombres.get(g) ?? g,
  )
}

function FilaDeGuardar(props: {
  puedeGuardar: boolean
  bloqueado: boolean
  enCurso: boolean
  esperada: string | null
  hayCambios: boolean
  alPublicar: () => void
  alDescartar: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 xl:col-start-1">
      <Button
        type="submit"
        className="min-h-11 md:min-h-9"
        disabled={!props.puedeGuardar || props.bloqueado}
      >
        {props.enCurso ? 'Guardando…' : 'Guardar'}
      </Button>
      <BotonesDeLaPlantilla
        esperada={props.esperada}
        hayCambios={props.hayCambios}
        ocupado={props.bloqueado}
        alPublicar={props.alPublicar}
        alDescartar={props.alDescartar}
      />
    </div>
  )
}

// Lo que el editor le pide a la pestaña: abrir los modales de publicar y de descartar el borrador (4.19-3c), que viven afuera, fuera de su `key`.
export type PropsDelEditorConAcciones = PropsDelEditor & {
  alPublicar: () => void
  alDescartar: () => void
  // El hueco que llena el área `tarjeta` (4.19-4); sin él, el editor no dibuja vista previa.
  VistaPrevia?: ComponentType<PropsDeLaVistaPreviaDeLaPlantilla>
}

// El editor de la plantilla de la tarjeta (4.19-3b): guarda el **borrador** del origen y, en su fila de botones, ofrece «Publicar…» y «Descartar borrador…» (4.19-3c).
// Nace de la plantilla que le arma el servidor (`propsDelEditor()`) y, con una versión nueva (`key` de la pestaña), se monta otro.
export function EditorDeLaPlantilla({
  alPublicar,
  alDescartar,
  VistaPrevia,
  ...props
}: PropsDelEditorConAcciones) {
  const { origen, esperada, inicial, guardada, contexto, tonos, avisos } = props
  const editor = useEditorDeLaPlantilla({
    origenId: origen.id,
    esperada,
    inicial,
    guardada,
    contexto,
  })
  const { plantilla, cambiar, rechazoDeForma } = editor
  const { puedeGuardar } = editor
  const guardar = useGuardarLaPlantilla({
    origenId: origen.id,
    esperada,
    plantilla,
    puedeGuardar,
    limpiarBorrador: editor.limpiar,
  })
  const deshabilitado = guardar.enCurso || guardar.entro || guardar.recargando
  const { motivoDe, deArriba } = useMotivosDelEditor(rechazoDeForma, guardar.porCampo)

  const filas = useMemo(() => filasDelEditor(plantilla, contexto), [plantilla, contexto])
  const deTonos = avisosDeLosTonos(plantilla.grupos, filas, tonos)
  // Escribir en un campo borra su motivo de la última respuesta.
  const campo = (donde: string, cambio: Parameters<typeof cambiar>[0]) => {
    guardar.olvidarCampo(donde)
    cambiar(cambio)
  }

  return (
    <form
      aria-label="Tarjeta"
      className={VistaPrevia === undefined ? CLASE_DEL_FORMULARIO : CLASE_CON_VISTA_PREVIA}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar.enviar()
      }}
    >
      <div className="grid min-w-0 gap-4 xl:col-start-1">
        <EncabezadoDelEditor {...props} />
        <AvisosDelEditor
          deLaLectura={[...avisos, ...deTonos, ...deArriba]}
          paraPublicar={editor.rechazoParaPublicar?.mensaje ?? null}
          guardar={guardar}
          hrefVer={`?seccion=tarjeta&origen=${origen.id}`}
        />
        <CuerpoDelEditor
          plantilla={plantilla}
          filas={filas}
          tonos={tonos}
          deshabilitado={deshabilitado}
          motivoDe={motivoDe}
          cambiar={cambiar}
          campo={campo}
        />
      </div>
      {VistaPrevia === undefined ? null : (
        <VistaPreviaDelEditor
          VistaPrevia={VistaPrevia}
          plantilla={plantilla}
          filas={filas}
          contexto={contexto}
          tonos={tonos}
        />
      )}
      <FilaDeGuardar
        puedeGuardar={puedeGuardar}
        bloqueado={deshabilitado || guardar.conflicto !== null}
        enCurso={guardar.enCurso}
        esperada={esperada}
        hayCambios={editor.hayCambios}
        alPublicar={alPublicar}
        alDescartar={alDescartar}
      />
    </form>
  )
}
