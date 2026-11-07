'use client'

import { useMemo } from 'react'
import { Button } from '@/shared/ui/button'
import { avisosDeTonos } from '../../../entities/plantilla/avisos-de-tonos'
import { filasDelEditor } from '../../../entities/plantilla/filas-del-editor'
import type { PropsDelEditor } from '../../../entities/plantilla/props-del-editor'
import { useEditorDeLaPlantilla } from '../hooks/use-editor-de-la-plantilla'
import { useGuardarLaPlantilla } from '../hooks/use-guardar-la-plantilla'
import { useMotivosDelEditor } from '../hooks/use-motivos-del-editor'
import { AvisosDelEditor } from './avisos-del-editor'
import { CuerpoDelEditor } from './cuerpo-del-editor'
import { EncabezadoDelEditor } from './encabezado-del-editor'

// El editor de la plantilla de la tarjeta (4.19-3b): guarda el **borrador** del origen (publicar y descartar son del 4.19-3c). Nace de la plantilla que le arma el
// servidor (`propsDelEditor()`) y, con una versión nueva (`key` de la pestaña), se monta otro.
export function EditorDeLaPlantilla(props: PropsDelEditor) {
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
  const nombres = new Map(filas.grupos.map((g) => [g.id, g.etiqueta]))
  const deTonos = avisosDeTonos(
    plantilla.grupos,
    tonos.map((t) => t.clave),
    (g) => nombres.get(g) ?? g,
  )
  // Escribir en un campo borra su motivo de la última respuesta.
  const campo = (donde: string, cambio: Parameters<typeof cambiar>[0]) => {
    guardar.olvidarCampo(donde)
    cambiar(cambio)
  }

  return (
    <form
      aria-label="Tarjeta"
      className="grid min-w-0 gap-4"
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar.enviar()
      }}
    >
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
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          className="min-h-11 md:min-h-9"
          disabled={!puedeGuardar || deshabilitado || guardar.conflicto !== null}
        >
          {guardar.enCurso ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
