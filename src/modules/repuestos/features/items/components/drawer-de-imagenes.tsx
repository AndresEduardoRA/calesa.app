'use client'

import { useRef } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { Skeleton } from '@/shared/ui/skeleton'
import { MAXIMO_DE_IMAGENES_POR_ITEM, type ImagenDeItem } from '../../../entities/items/imagenes'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { useImagenesDeItem } from '../hooks/use-imagenes-de-item'
import { GaleriaDeImagenes } from './galeria-de-imagenes'
import { SubidaDeImagenes } from './subida-de-imagenes'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Cada apertura empieza de cero (se lee de nuevo).
  apertura: number
  // El ítem que se muestra (el último que se vio, mientras el panel se va).
  item: FilaDeItem | null
  // `puedeEditar` (repuestos.editar) y no cerrado: sin eso el panel es de lectura (D70).
  editable: boolean
  cerrado: boolean
  focoAlCerrar: () => HTMLElement | boolean
}

const MOTIVO_CERRADO = 'El proyecto está cerrado: reábrelo para cambiar las imágenes.'
const MOTIVO_SIN_PERMISO = 'Sólo puedes ver las imágenes de este ítem.'

type PropsDelContenido = Pick<Props, 'editable' | 'cerrado'> & { item: FilaDeItem }

function ContenidoDeItem({ item, editable, cerrado }: PropsDelContenido) {
  const encabezado = useRef<HTMLParagraphElement>(null)
  const { lectura, reintentar, imagenes, alAgregar, quitar, quitando } = useImagenesDeItem(item.id)
  async function alQuitar(imagen: ImagenDeItem) {
    if (await quitar(imagen)) {
      // La imagen que tenía el foco ya no está: el foco queda en el contador, no se pierde.
      encabezado.current?.focus()
    }
  }
  if (lectura.estado === 'leyendo') {
    return (
      <div
        role="status"
        aria-label="Cargando las imágenes"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        <Skeleton className="aspect-4/3" />
        <Skeleton className="aspect-4/3" />
        <Skeleton className="aspect-4/3" />
      </div>
    )
  }
  if (lectura.estado === 'fallo') {
    return (
      <div className="grid gap-2">
        <Aviso tono="peligro">
          <p>{lectura.error.mensaje}</p>
        </Aviso>
        <Button type="button" variant="outline" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  return (
    <div className="grid gap-3">
      <p
        ref={encabezado}
        tabIndex={-1}
        aria-live="polite"
        className="text-(length:--text-sm) outline-none"
      >
        {imagenes.length} de {MAXIMO_DE_IMAGENES_POR_ITEM} imágenes
      </p>
      {editable ? null : <Aviso tono="info">{cerrado ? MOTIVO_CERRADO : MOTIVO_SIN_PERMISO}</Aviso>}
      {editable ? (
        <SubidaDeImagenes itemId={item.id} cuantas={imagenes.length} alAgregar={alAgregar} />
      ) : null}
      {imagenes.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Este ítem aún no tiene imágenes
        </p>
      ) : (
        <GaleriaDeImagenes
          descripcion={item.descripcion}
          imagenes={imagenes}
          alQuitar={editable ? (imagen) => void alQuitar(imagen) : null}
          quitando={quitando}
        />
      )}
    </div>
  )
}

// El panel de imágenes de un ítem (`?panel=imagenes&item=<id>`, 8.09-3, C11 y C12): contador exacto («3 de 8»: el tope es duro), la zona para subir, la galería con «Quitar» y «Deshacer».
// Se queda montado cerrado y cada apertura remonta el contenido con su `key`. No guarda nada tipeado: sube y quita al instante.
export function DrawerDeImagenes({ apertura, item, editable, cerrado, ...resto }: Props) {
  return (
    <Drawer
      abierto={resto.abierto}
      alCerrar={resto.alCerrar}
      titulo={item ? `Imágenes de «${item.descripcion}»` : 'Imágenes del ítem'}
      descripcion="Hasta 8 imágenes por ítem."
      ancho="amplio"
      focoAlCerrar={resto.focoAlCerrar}
    >
      {item ? (
        <ContenidoDeItem key={apertura} item={item} editable={editable} cerrado={cerrado} />
      ) : null}
    </Drawer>
  )
}
