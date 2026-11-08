'use client'

import { useId } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { ZonaDeArchivos } from '@/shared/ui/zona-de-archivos'
import {
  MENSAJE_DEL_TOPE,
  puedeQuitarAdjunto,
  TIPOS_QUE_SE_ELIGEN,
} from '../../../entities/comentarios/adjunto'
import { quitarAdjunto } from '../actions/quitar-adjunto'
import { useAdjuntos, type Adjuntos as EstadoDeAdjuntos } from '../hooks/use-adjuntos'
import { useQuitadoPorUrl } from '../hooks/use-quitado-por-url'
import { useSubidaDeAdjuntos, type SubidaPendiente } from '../hooks/use-subida-de-adjuntos'
import { FilaDeAdjunto } from './adjunto'
import { ConfirmarQuitadoDeAdjunto } from './confirmar-quitado'

type Quien = { puedeAdjuntar: boolean; puedeModerar: boolean }

const TEXTO = 'text-(length:--text-sm) text-(--color-ink-soft)'
const BOTON = 'min-h-11 md:min-h-8'

// Una subida en curso o que falló, arriba de la lista.
function FilaDeSubida(props: {
  pendiente: SubidaPendiente
  reintentar: (pendiente: SubidaPendiente) => void
  descartar: (clave: string) => void
}) {
  const { pendiente } = props
  if (pendiente.error === null) {
    return (
      <li className={TEXTO} aria-live="polite">
        Subiendo {pendiente.archivo.name}…
      </li>
    )
  }
  return (
    <li className="grid gap-1">
      <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
        {pendiente.error.mensaje}
      </p>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={BOTON}
          onClick={() => {
            props.reintentar(pendiente)
          }}
        >
          Reintentar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={BOTON}
          onClick={() => {
            props.descartar(pendiente.clave)
          }}
        >
          Descartar
        </Button>
      </div>
    </li>
  )
}

// La lista o lo que va en su lugar: el error con «Reintentar», el esqueleto o el vacío.
function ListaDeAdjuntos(props: {
  adjuntos: EstadoDeAdjuntos
  hayPendientes: boolean
  quien: Quien
  pedirQuitar: (id: string) => void
}) {
  const { adjuntos, quien } = props
  if (adjuntos.errorDeLectura) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2">
        <p className={TEXTO}>{adjuntos.errorDeLectura.mensaje}</p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={adjuntos.reintentar}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  if (!adjuntos.cargada) {
    return (
      <div aria-busy="true" aria-label="Cargando los adjuntos" className="grid gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    )
  }
  if (adjuntos.lista.length === 0) {
    return props.hayPendientes ? null : <p className={TEXTO}>Todavía no hay adjuntos.</p>
  }
  return (
    <ul className="grid min-w-0 gap-2">
      {adjuntos.lista.map((adjunto) => (
        <FilaDeAdjunto
          key={adjunto.id}
          adjunto={adjunto}
          quitable={puedeQuitarAdjunto(adjunto, quien)}
          pedirQuitar={(a) => {
            props.pedirQuitar(a.id)
          }}
        />
      ))}
    </ul>
  )
}

// Los adjuntos de una cotización (4.27-3), dentro de la sección «Comentarios», arriba del campo: quien puede guardarla los sube (PDF, imágenes o Word, hasta 20);
// todos los que la ven los bajan; quitar, quien lo subió o quien modera, con su diálogo por la URL. Se leen junto con la primera página de comentarios.
export function Adjuntos({ cotizacionId, quien }: { cotizacionId: string; quien: Quien }) {
  const titulo = useId()
  const adjuntos = useAdjuntos(cotizacionId)
  const subida = useSubidaDeAdjuntos(cotizacionId, adjuntos.lista.length, adjuntos.agregar)
  const quitado = useQuitadoPorUrl(adjuntos.lista, adjuntos.cargada, quien)

  return (
    <section aria-labelledby={titulo} className="grid min-w-0 gap-2">
      <h3 id={titulo} className="text-(length:--text-base) font-semibold text-(--color-ink)">
        Adjuntos
      </h3>
      {quien.puedeAdjuntar && !adjuntos.errorDeLectura ? (
        <ZonaDeArchivos
          aceptar={TIPOS_QUE_SE_ELIGEN}
          alElegir={subida.elegir}
          etiquetaDeElegir="Adjuntar archivo"
          ayuda={
            adjuntos.enElTope
              ? MENSAJE_DEL_TOPE
              : 'PDF, imágenes o Word, hasta 25 MB. Hasta 20 por cotización.'
          }
          deshabilitada={!adjuntos.cargada || subida.subiendo || adjuntos.enElTope}
        />
      ) : null}
      {subida.rechazos.length > 0 ? (
        <div role="status" className={TEXTO}>
          {subida.rechazos.map((rechazo) => (
            <p key={rechazo}>{rechazo}</p>
          ))}
        </div>
      ) : null}
      {subida.pendientes.length > 0 ? (
        <ul className="grid gap-2">
          {subida.pendientes.map((pendiente) => (
            <FilaDeSubida
              key={pendiente.clave}
              pendiente={pendiente}
              reintentar={subida.reintentar}
              descartar={subida.descartar}
            />
          ))}
        </ul>
      ) : null}
      <ListaDeAdjuntos
        adjuntos={adjuntos}
        hayPendientes={subida.pendientes.length > 0}
        quien={quien}
        pedirQuitar={quitado.abrir}
      />
      <ConfirmarQuitadoDeAdjunto
        objetivo={quitado.adjunto}
        quitar={async (adjunto) => {
          const envio = await enviarAccion<{ resultado: 'quitado' }>(
            quitarAdjunto({ adjuntoId: adjunto.id }),
            'No se pudo quitar el adjunto.',
          )
          if (!envio.ok) {
            return envio.error
          }
          adjuntos.sacar(adjunto.id)
          return null
        }}
        alCerrar={quitado.cerrar}
      />
    </section>
  )
}
