'use client'

import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import {
  LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE,
  LARGO_MAXIMO_DEL_CONTENEDOR,
} from '../../../entities/transporte/transporte'
import type { PropsDeCampos } from './campos-de-ruta'

// «Contenedor y booking»: se escriben como salgan; la base los guarda en mayúsculas y sin espacios (6.08-2).
export function CamposDeContenedor({
  prefijo,
  valores,
  errores,
  escribir,
  apagado,
}: PropsDeCampos) {
  return (
    <>
      <Campo
        nombre={`${prefijo}-contenedor`}
        etiqueta="Contenedor"
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={LARGO_MAXIMO_DEL_CONTENEDOR * 2}
        value={valores.contenedor}
        onChange={(e) => {
          escribir('contenedor', e.target.value)
        }}
        error={errores.contenedor}
        disabled={apagado}
      />
      <Campo
        nombre={`${prefijo}-booking`}
        etiqueta="Booking"
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={LARGO_MAXIMO_DEL_CONTENEDOR * 2}
        value={valores.booking}
        onChange={(e) => {
          escribir('booking', e.target.value)
        }}
        error={errores.booking}
        disabled={apagado}
      />
    </>
  )
}

// «Fechas y notas»: son `date` (sin hora, D18) y viajan `AAAA-MM-DD` tal cual.
export function CamposDeFechasYNotas({
  prefijo,
  valores,
  errores,
  escribir,
  apagado,
}: PropsDeCampos) {
  const idDeNotas = `${prefijo}-notas`
  return (
    <>
      <Campo
        nombre={`${prefijo}-zarpe`}
        etiqueta="Zarpe"
        type="date"
        value={valores.zarpe}
        onChange={(e) => {
          escribir('zarpe', e.target.value)
        }}
        error={errores.zarpe}
        disabled={apagado}
      />
      <Campo
        nombre={`${prefijo}-eta`}
        etiqueta="ETA"
        type="date"
        value={valores.eta}
        onChange={(e) => {
          escribir('eta', e.target.value)
        }}
        error={errores.eta}
        disabled={apagado}
      />
      <Campo
        nombre={`${prefijo}-arribo`}
        etiqueta="Arribo"
        type="date"
        value={valores.arribo}
        onChange={(e) => {
          escribir('arribo', e.target.value)
        }}
        error={errores.arribo}
        disabled={apagado}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={idDeNotas}>Notas</Label>
        <Textarea
          id={idDeNotas}
          name={idDeNotas}
          maxLength={LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE}
          value={valores.notas}
          onChange={(e) => {
            escribir('notas', e.target.value)
          }}
          aria-invalid={errores.notas ? true : undefined}
          aria-describedby={errores.notas ? `${idDeNotas}-error` : undefined}
          disabled={apagado}
        />
        {errores.notas ? (
          <p
            id={`${idDeNotas}-error`}
            className="text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {errores.notas}
          </p>
        ) : null}
      </div>
    </>
  )
}
