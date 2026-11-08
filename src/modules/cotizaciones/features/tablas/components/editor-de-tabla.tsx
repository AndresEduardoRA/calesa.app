'use client'

import { useEffect, useRef } from 'react'
import { useRegional } from '@/shared/ui/regional'
import { avisar, avisarConDeshacer } from '@/shared/ui/toasts'
import type { FilaEditable } from '../../../entities/tablas/edicion'
import type { TablaDeReferencia } from '../../../entities/tablas/lectura'
import type { EstadoDelEditor } from '../../../entities/tablas/vista-del-editor'
import { useBorradorAlAbrir, useBorradorDeTabla } from '../hooks/use-borrador-de-tabla'
import { useFilasDeTabla } from '../hooks/use-filas-de-tabla'
import { AvisoDelPrimerError } from './aviso-del-primer-error'
import { BarraDeCambios } from './barra-de-cambios'
import { EncabezadoDelEditor } from './encabezado-del-editor'
import { FilasDelEditor } from './filas-del-editor'
import { PaginasDelEditor } from './paginas-del-editor'
import { PublicarTabla } from './publicar-tabla'

type Props = {
  // La viva, con su versión (la que «Publicar» manda como esperada) y `tapada` del ítem de la lista.
  tabla: TablaDeReferencia
  // Todas sus filas activas, en su orden.
  filas: FilaEditable[]
  origen: { id: string; nombre: string }
}

const RECUPERADO = 'Recuperamos tus cambios sin publicar.'
const VIEJO = 'Esta tabla se publicó después de tus cambios sin publicar: no se recuperaron.'

// El editor de una tabla de referencia (4.23-3, C4–C8, C10): la tabla entera en memoria, de a 100 filas por página; nada se escribe hasta publicar. Lo hecho queda en
// un borrador de la pestaña del navegador, por versión. Quien lo monta le da `key` con el id y la versión: publicar trae otra y lo vuelve a montar.
export function EditorDeTabla({ tabla, filas, origen }: Props) {
  const { locale } = useRegional()
  const recuperado = useBorradorAlAbrir(tabla.id, tabla.version)
  const leido: EstadoDelEditor = { filas, crudos: {} }
  const edicion = useFilasDeTabla({
    columnas: tabla.columnas,
    leidas: filas,
    inicial: recuperado?.tipo === 'misma' ? recuperado : leido,
    locale,
  })
  const { estado, cambios } = edicion
  const borrador = useBorradorDeTabla({
    tablaId: tabla.id,
    version: tabla.version,
    estado,
    cambios,
  })

  // Lo último editado: el «Descartar» del aviso al abrir se llama después y tiene que deshacer hasta ahí, no hasta lo recuperado.
  const ultimo = useRef(estado)
  useEffect(() => {
    ultimo.current = estado
  })

  function descartar() {
    const previo = ultimo.current
    edicion.reponer(leido)
    borrador.borrar()
    avisarConDeshacer('Descartaste los cambios sin publicar.', () => {
      edicion.reponer(previo)
    })
  }

  // Al abrir, una vez: qué pasó con el borrador.
  const avisado = useRef(false)
  useEffect(() => {
    if (avisado.current || recuperado === null) return
    avisado.current = true
    if (recuperado.tipo === 'misma') {
      avisar(RECUPERADO, { etiqueta: 'Descartar', alHacer: descartar })
    } else {
      borrador.borrar()
      avisar(VIEJO)
    }
  })

  return (
    <section aria-label={`Editar ${tabla.nombre}`} className="grid min-w-0 gap-3">
      <EncabezadoDelEditor tabla={tabla} origen={origen} />
      {edicion.error ? (
        <AvisoDelPrimerError
          error={edicion.error}
          alIr={() => {
            if (edicion.error) edicion.irA(edicion.error)
          }}
          alDescartar={descartar}
        />
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {edicion.anuncio}
      </p>
      <FilasDelEditor
        nombre={tabla.nombre}
        columnas={tabla.columnas}
        edicion={edicion}
        locale={locale}
      />
      <PaginasDelEditor
        paginas={edicion.paginas}
        pagina={edicion.pagina}
        alElegir={edicion.setPagina}
      />
      <BarraDeCambios cambios={cambios} alDescartar={descartar}>
        <PublicarTabla tabla={tabla} edicion={edicion} borrador={borrador} />
      </BarraDeCambios>
    </section>
  )
}
