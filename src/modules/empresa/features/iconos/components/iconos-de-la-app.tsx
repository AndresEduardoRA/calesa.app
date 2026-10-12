'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { Opciones } from '@/shared/ui/opciones'
import type { FondoDeIcono, Iconos } from '../../../entities/iconos'
import { MOTIVO_SIN_LOGO } from '../../../entities/motivos'
import { useIconos } from '../hooks/use-iconos'
import { VistaPreviaDeIconos } from './vista-previa-de-iconos'

type Props = {
  // URL pública del logo guardado, o null si la empresa no cargó uno.
  logoUrl: string | null
  colorAcento: string | null
  // Los íconos guardados hoy, o null si valen los neutros.
  iconos: Iconos | null
  // La dirección del ícono de 192 px en uso (el propio o el neutro), ya armada en el servidor.
  iconoActualUrl: string
  // ISO: la versión de los ajustes, que viaja con cada guardado.
  actualizadoEn: string
  puedeEditar: boolean
}

const FONDOS = [
  { valor: 'marca', etiqueta: 'Color de marca' },
  { valor: 'blanco', etiqueta: 'Blanco' },
] as const

// «Regenerar íconos»: el ícono de la app (pestaña del navegador, «Agregar a inicio», PWA) a
// partir del logo guardado. Sin logo no hay de dónde dibujarlos, y se dice.
export function IconosDeLaApp(props: Props) {
  const { logoUrl, iconos, iconoActualUrl, puedeEditar } = props
  const [fondo, setFondo] = useState<FondoDeIcono>('marca')
  const { dibujados, dibujar, confirmar, descartar, volverALosNeutros, enCurso } = useIconos(props)
  const bloqueado = !puedeEditar || enCurso

  return (
    <Bloque
      titulo="Íconos de la app"
      descripcion="El ícono de la pestaña del navegador y el que queda al instalar la app en el celular."
    >
      <div className="flex flex-wrap items-center gap-4">
        <Image
          src={iconoActualUrl}
          alt="Ícono actual de la app"
          width={56}
          height={56}
          unoptimized
          className="size-14"
        />
        <p className="min-w-0 flex-1 text-(length:--text-sm) text-(--color-ink-soft)">
          {iconos
            ? 'La app usa los íconos generados desde el logo.'
            : 'La app usa los íconos neutros. Con el logo cargado se pueden generar los propios.'}
        </p>
      </div>
      <Opciones
        etiqueta="Fondo"
        ayuda="Si el logo es del color de la marca, sobre ese mismo color no se ve: prueba con blanco."
        opciones={FONDOS}
        valor={fondo}
        alCambiar={setFondo}
        deshabilitado={bloqueado || !logoUrl}
      />
      {dibujados ? <VistaPreviaDeIconos dibujados={dibujados} /> : null}
      <div className="flex flex-wrap gap-2">
        {dibujados ? (
          <>
            <Button className="h-11 md:h-9" disabled={bloqueado} onClick={() => void confirmar()}>
              {enCurso ? 'Guardando…' : 'Guardar íconos'}
            </Button>
            <Button
              variant="ghost"
              className="h-11 md:h-9"
              disabled={bloqueado}
              onClick={descartar}
            >
              Descartar
            </Button>
          </>
        ) : null}
        <Button
          variant="outline"
          className="h-11 md:h-9"
          disabled={bloqueado || !logoUrl}
          onClick={() => void dibujar(fondo)}
        >
          {dibujados ? 'Volver a dibujar' : 'Regenerar íconos'}
        </Button>
        {iconos && !dibujados ? (
          <Button
            variant="ghost"
            className="h-11 md:h-9"
            disabled={bloqueado}
            onClick={() => void volverALosNeutros()}
          >
            Volver a los neutros
          </Button>
        ) : null}
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {logoUrl
          ? 'Donde la app ya está instalada, el ícono cambia recién al reinstalarla; en una pestaña abierta, al vaciar la caché del navegador.'
          : MOTIVO_SIN_LOGO}
      </p>
    </Bloque>
  )
}
