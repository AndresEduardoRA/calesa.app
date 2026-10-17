'use client'

import { useEffect, useMemo, useState } from 'react'
import { descargarCsv } from '@/shared/lib/csv/descargar'
import { BOM_UTF8, lineasDeCsv } from '@/shared/lib/csv/escribir'
import type { ContextoDeAlta } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import {
  NOMBRE_DE_LOS_ERRORES,
  filasRechazadas,
  tablaDeRechazadas,
} from '../../../entities/importacion/plantilla'
import { useAsistenteDeImportacion } from '../hooks/use-asistente-de-importacion'
import { useImportacion } from '../hooks/use-importacion'
import { useLimpiarDeshacerHuerfano } from '../hooks/use-revision-del-deshacer'
import { PasoArchivo } from './paso-archivo'
import { PasoEmparejar } from './paso-emparejar'
import { PasoImportando } from './paso-importando'
import { PasoResultado } from './paso-resultado'
import { PasoVistaPrevia } from './paso-vista-previa'

type Paso = 'archivo' | 'emparejar' | 'previa' | 'importando' | 'resultado'

const TITULO_DE_PASO: Record<Paso, string> = {
  archivo: 'Archivo',
  emparejar: 'Columnas',
  previa: 'Vista previa',
  importando: 'Importando',
  resultado: 'Resultado',
}
const ORDEN: readonly Paso[] = ['archivo', 'emparejar', 'previa', 'importando', 'resultado']

type Props = { campos: CampoDeLead[]; contexto: ContextoDeAlta; zona: string }
type PropsDelAsistente = Props & { alReiniciar: () => void }

function Pasos({ actual }: { actual: Paso }) {
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-1 text-(length:--text-sm)" aria-label="Pasos">
      {ORDEN.map((paso, i) => (
        <li
          key={paso}
          aria-current={paso === actual ? 'step' : undefined}
          className={paso === actual ? 'font-semibold' : 'text-(--color-ink-faint)'}
        >
          {i + 1}. {TITULO_DE_PASO[paso]}
        </li>
      ))}
    </ol>
  )
}

function Asistente({ campos, contexto, zona, alReiniciar }: PropsDelAsistente) {
  const asistente = useAsistenteDeImportacion({ campos, contexto, zona })
  const [paso, setPaso] = useState<Paso>('archivo')
  const validas = useMemo(
    () => asistente.preparadas.flatMap((fila) => (fila.pedido ? [fila.pedido] : [])),
    [asistente.preparadas],
  )
  const importacion = useImportacion({
    validas,
    rechazadasEnLaVistaPrevia: asistente.preparadas.length - validas.length,
    origenId: asistente.eleccion.origenId,
  })

  const rechazadas = useMemo(
    () => filasRechazadas(asistente.preparadas, importacion.resultados, asistente.objetivos),
    // `resultados` cambia por dentro: el resumen es lo que cambia de identidad al llegar un lote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asistente.preparadas, asistente.objetivos, importacion.resumen],
  )

  function descargarErrores() {
    const tabla = tablaDeRechazadas(asistente.archivo?.encabezados ?? [], rechazadas)
    descargarCsv(BOM_UTF8 + lineasDeCsv(tabla, ';'), NOMBRE_DE_LOS_ERRORES)
  }

  const importando = paso === 'importando' || paso === 'resultado'
  const terminado = importacion.fase === 'terminada' || importacion.fase === 'cancelada'
  const pasoVisible: Paso = importando && terminado ? 'resultado' : paso
  useLimpiarDeshacerHuerfano(pasoVisible === 'resultado')

  return (
    <div className="grid max-w-3xl gap-5">
      <Pasos actual={pasoVisible} />
      {pasoVisible === 'archivo' ? (
        <PasoArchivo
          campos={campos}
          contexto={contexto}
          zona={zona}
          alCargar={(archivo) => {
            asistente.cargar(archivo)
            setPaso('emparejar')
          }}
        />
      ) : null}
      {pasoVisible === 'emparejar' && asistente.archivo ? (
        <PasoEmparejar
          asistente={{ ...asistente, archivo: asistente.archivo }}
          contexto={contexto}
          alVolver={() => {
            asistente.reiniciar()
            setPaso('archivo')
          }}
          alContinuar={() => {
            setPaso('previa')
          }}
        />
      ) : null}
      {pasoVisible === 'previa' ? (
        <PasoVistaPrevia
          preparadas={asistente.preparadas}
          objetivos={asistente.objetivos}
          alVolver={() => {
            setPaso('emparejar')
          }}
          alImportar={() => {
            setPaso('importando')
            importacion.empezar()
          }}
        />
      ) : null}
      {pasoVisible === 'importando' ? (
        <PasoImportando importacion={importacion} validas={validas.length} />
      ) : null}
      {pasoVisible === 'resultado' ? (
        <PasoResultado
          cancelada={importacion.fase === 'cancelada'}
          resumen={importacion.resumen}
          paraCorregir={rechazadas.length}
          cierre={importacion.cierre}
          alDescargarErrores={descargarErrores}
          alImportarOtro={alReiniciar}
        />
      ) : null}
    </div>
  )
}

// El asistente de importación (`/leads/importar`). Todo lo del archivo vive sólo en la memoria de esta
// pantalla: no se guarda en la URL, en el almacenamiento del navegador ni en ningún registro, y se
// olvida al salir y cuando Next esconde la pantalla (el árbol queda guardado: el efecto se limpia y
// vuelve a empezar de cero).
export function AsistenteDeImportacion(props: Props) {
  const [corrida, setCorrida] = useState(0)
  useEffect(
    () => () => {
      setCorrida((valor) => valor + 1)
    },
    [],
  )
  return (
    <Asistente
      key={corrida}
      {...props}
      alReiniciar={() => {
        setCorrida((valor) => valor + 1)
      }}
    />
  )
}
