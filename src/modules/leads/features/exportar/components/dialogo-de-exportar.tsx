'use client'

import { useState } from 'react'
import { DELIMITADORES, esDelimitador, type Delimitador } from '@/shared/lib/csv/escribir'
import { formatearHora } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Modal } from '@/shared/ui/modal'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import {
  CLAVE_DE_DELIMITADOR_GUARDADO,
  EXPORTACIONES_POR_HORA,
  TOPE_DE_EXPORTACION,
  consultaDelListado,
} from '../../../entities/exportacion'
import { useExportacion, type EstadoDeExportacion } from '../hooks/use-exportacion'

const OPCIONES = [
  { valor: ';', etiqueta: 'Punto y coma (;): Excel en español' },
  { valor: ',', etiqueta: 'Coma (,)' },
] as const satisfies readonly { valor: Delimitador; etiqueta: string }[]

// El separador de la última vez: sólo eso se recuerda, y no es un dato de nadie. Sin almacenamiento
// (un navegador en privado) arranca con el que abre Excel en español.
function separadorGuardado(): Delimitador {
  try {
    const guardado = window.localStorage.getItem(CLAVE_DE_DELIMITADOR_GUARDADO)
    return esDelimitador(guardado) ? guardado : DELIMITADORES[0]
  } catch {
    return DELIMITADORES[0]
  }
}

function recordarSeparador(delimitador: Delimitador): void {
  try {
    window.localStorage.setItem(CLAVE_DE_DELIMITADOR_GUARDADO, delimitador)
  } catch {
    // Sin almacenamiento no se recuerda: no pasa nada.
  }
}

function MensajeDelEstado({
  estado,
  zona,
  locale,
}: {
  estado: EstadoDeExportacion
  zona: string
  locale: string
}) {
  switch (estado.tipo) {
    case 'limite':
      return (
        <Aviso tono="aviso">
          Ya exportaste {EXPORTACIONES_POR_HORA} veces en la última hora. Podrás hacerlo de nuevo a
          las {formatearHora(estado.libreEn, { zona })}.
        </Aviso>
      )
    case 'demasiadas':
      return (
        <Aviso tono="aviso">
          Hay más de {formatearNumero(TOPE_DE_EXPORTACION, { locale })} leads con estos filtros y
          una exportación lleva hasta esa cantidad. Filtra un poco más y vuelve a intentarlo.
        </Aviso>
      )
    case 'vacia':
      return <Aviso tono="info">No hay leads de tu cartera con estos filtros para exportar.</Aviso>
    case 'sin_permiso':
      return <Aviso tono="peligro">No tienes permiso para exportar leads.</Aviso>
    case 'sin_red':
      return (
        <Aviso tono="peligro">
          No hay conexión. Cuando vuelva, descárgalo de nuevo: no se guardó nada a medias.
        </Aviso>
      )
    case 'error':
      return <Aviso tono="peligro">{estado.mensaje}</Aviso>
    case 'reposo':
    case 'descargando':
    case 'listo':
      return null
  }
}

type Props = { abierto: boolean; alCerrar: () => void }

// «Exportar»: el CSV de los leads de tu cartera que muestra el listado, con sus filtros. Elige el
// separador y descarga; lo que pasó (el tope, el límite por hora, la red) se dice acá, sin cerrar.
export function DialogoDeExportar({ abierto, alCerrar }: Props) {
  const regional = useRegional()
  const enLinea = useEnLinea()
  const exportacion = useExportacion()
  const [separador, setSeparador] = useState<Delimitador>(separadorGuardado)
  const descargando = exportacion.estado.tipo === 'descargando'

  function cerrar() {
    exportacion.reiniciar()
    alCerrar()
  }

  async function descargar() {
    recordarSeparador(separador)
    // Los filtros que la persona está viendo, tal como están en la URL ahora.
    await exportacion.exportar(consultaDelListado(window.location.search), separador)
  }

  const listo = exportacion.estado.tipo === 'listo' ? exportacion.estado : null
  if (listo) {
    avisarExito(
      `Descargamos ${formatearNumero(listo.filas, { locale: regional.locale })} ${
        listo.filas === 1 ? 'lead' : 'leads'
      } en ${listo.nombre}.`,
    )
    cerrar()
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={cerrar}
      titulo="Exportar leads"
      descripcion="Descarga en CSV los leads de tu cartera que muestra el listado, con sus filtros y las columnas de la ficha."
      pie={
        <>
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-11 md:h-9"
            disabled={descargando || !enLinea}
            onClick={() => void descargar()}
          >
            {descargando ? 'Descargando…' : 'Descargar'}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <CampoSeleccion
          nombre="separador"
          etiqueta="Separador de columnas"
          opciones={OPCIONES}
          value={separador}
          onChange={(evento) => {
            const valor = evento.target.value
            if (esDelimitador(valor)) {
              setSeparador(valor)
            }
          }}
          ayuda={`Hasta ${formatearNumero(TOPE_DE_EXPORTACION, { locale: regional.locale })} leads y ${EXPORTACIONES_POR_HORA} descargas por hora.`}
        />
        {enLinea ? null : (
          <Aviso tono="aviso">No hay conexión. Vuelve a intentarlo cuando regrese.</Aviso>
        )}
        <MensajeDelEstado
          estado={exportacion.estado}
          zona={regional.zonaHoraria}
          locale={regional.locale}
        />
      </div>
    </Modal>
  )
}
