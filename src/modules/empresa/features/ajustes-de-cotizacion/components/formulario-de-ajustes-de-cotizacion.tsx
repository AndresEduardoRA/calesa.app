'use client'

import { useRef, useState } from 'react'
import { errorDeCampo } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import {
  VIGENCIA_MAXIMA_DIAS,
  VIGENCIA_MINIMA_DIAS,
  type AjustesDeCotizacion,
} from '../../../entities/ajustes-de-cotizacion'
import { MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION } from '../../../entities/motivos'
import { useGuardarAjustesDeCotizacion } from '../hooks/use-guardar-ajustes-de-cotizacion'

type Props = {
  ajustes: AjustesDeCotizacion
  // Configurar el cotizador en todos los orígenes (`puedeCambiarAjustesDeCotizacion`): sin eso se leen y no se cambian.
  puedeCambiar: boolean
}

// Configuración › Cotización › Ajustes: la vigencia y el vehículo obligatorio al cotizar, que valen para todas las cotizaciones.
// Dos campos: sin borrador. Quien lo usa le pone de `key` la versión de la fila, así que lo guardado (aquí o por otra persona)
// lo vuelve a montar desde la base.
export function FormularioDeAjustesDeCotizacion({ ajustes, puedeCambiar }: Props) {
  const formulario = useRef<HTMLFormElement>(null)
  const [vehiculoObligatorio, setVehiculoObligatorio] = useState(
    ajustes.vehiculoObligatorioAlCotizar,
  )
  const { guardar, enCurso, errores } = useGuardarAjustesDeCotizacion({
    actualizadoEn: ajustes.actualizadoEn,
    formulario,
  })
  const bloqueado = !puedeCambiar || enCurso

  return (
    <form
      ref={formulario}
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar(vehiculoObligatorio)
      }}
    >
      <h2 className="text-(length:--text-lg) font-semibold text-(--color-ink)">Ajustes</h2>
      {/* Un <fieldset> deshabilitado apaga los campos de adentro, también para el teclado. */}
      <fieldset disabled={bloqueado} className="grid min-w-0 gap-4">
        <legend className="sr-only">Ajustes de cotización</legend>
        {puedeCambiar ? null : <Aviso>{MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION}</Aviso>}
        <Bloque
          titulo="Vigencia y vehículo"
          descripcion="Valen para todas las cotizaciones de todos los orígenes."
        >
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <Campo
              nombre="vigenciaDias"
              etiqueta="Vigencia (días)"
              type="number"
              inputMode="numeric"
              min={VIGENCIA_MINIMA_DIAS}
              max={VIGENCIA_MAXIMA_DIAS}
              defaultValue={ajustes.vigenciaDias}
              ayuda="Cuántos días vale una cotización desde el día en que se creó. Cambia también cuándo vence cada cotización ya guardada."
              error={errorDeCampo(errores, 'vigenciaDias')}
            />
            <Interruptor
              titulo="Vehículo obligatorio al cotizar"
              ayuda="Encendido, toda cotización pide su vehículo. Apagado, una preventa se guarda sin vehículo; una final siempre lo pide."
              valor={vehiculoObligatorio}
              alCambiar={setVehiculoObligatorio}
              deshabilitado={bloqueado}
            />
          </div>
        </Bloque>
      </fieldset>
      {puedeCambiar ? (
        <div>
          <Button type="submit" className="h-11 md:h-9" disabled={enCurso}>
            {enCurso ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      ) : null}
    </form>
  )
}
