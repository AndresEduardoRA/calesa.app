'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import {
  CLAVE_DEL_ALTA,
  LARGO_MAXIMO_DEL_DETALLE,
  LARGO_MAXIMO_DEL_RESUMEN,
  type ContextoDeAlta,
} from '../../../entities/alta'
import { atajosDeFecha } from '../../../entities/recordatorio'
import type { AltaDeLead } from '../hooks/use-alta-de-lead'

type Props = {
  alta: AltaDeLead
  contexto: ContextoDeAlta
  zona: string
}

const idDe = (clave: string) => `lead-${clave}`

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '')

// El recordatorio, opcional: un atajo («Mañana 09:00», «En 3 días 09:00») o la fecha escrita. Los
// atajos van antes del campo: un campo de fecha y hora tiene una parada de Tab por cada parte y con
// el teclado se llega primero a ellos.
function Recordatorio({ alta, zona }: Pick<Props, 'alta' | 'zona'>) {
  const { valores, errores, enCurso, cambiar } = alta
  // Los atajos se calculan al mostrar el paso: «mañana» es el de hoy en la zona de la empresa.
  const atajos = atajosDeFecha(new Date().toISOString(), zona)
  const hayRecordatorio = texto(valores[CLAVE_DEL_ALTA.recordatorio]) !== ''
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-(length:--text-sm) font-medium text-(--color-ink)">
        Recordatorio (opcional)
      </legend>
      <div className="flex flex-wrap gap-2">
        {atajos.map((atajo) => (
          <Button
            key={atajo.clave}
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 md:min-h-7"
            onClick={() => {
              cambiar(CLAVE_DEL_ALTA.recordatorio, atajo.local)
            }}
            disabled={enCurso}
          >
            {atajo.etiqueta}
          </Button>
        ))}
        {hayRecordatorio ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-11 md:min-h-7"
            onClick={() => {
              cambiar(CLAVE_DEL_ALTA.recordatorio, '')
            }}
            disabled={enCurso}
          >
            Quitar
          </Button>
        ) : null}
      </div>
      <Campo
        nombre={idDe(CLAVE_DEL_ALTA.recordatorio)}
        etiqueta="Fecha y hora"
        type="datetime-local"
        value={texto(valores[CLAVE_DEL_ALTA.recordatorio])}
        onChange={(evento) => {
          cambiar(CLAVE_DEL_ALTA.recordatorio, evento.target.value)
        }}
        error={errores[CLAVE_DEL_ALTA.recordatorio]}
        disabled={enCurso}
      />
    </fieldset>
  )
}

// El primer seguimiento del lead: de qué tipo fue, un resumen y, si hace falta, un recordatorio con
// atajos de fecha. Los tipos salen de la base (`tipos_seguimiento`): ninguno está escrito acá.
export function PasoSeguimiento({ alta, contexto, zona }: Props) {
  const { valores, errores, enCurso, cambiar } = alta
  const tipos = contexto.tiposDeSeguimiento
  const detalleError = errores[CLAVE_DEL_ALTA.detalle]
  return (
    <div className="grid gap-3">
      <CampoSeleccion
        nombre={idDe(CLAVE_DEL_ALTA.tipoDeSeguimiento)}
        etiqueta="Tipo de seguimiento"
        opciones={tipos.map((t) => ({ valor: t.id, etiqueta: t.nombre }))}
        value={texto(valores[CLAVE_DEL_ALTA.tipoDeSeguimiento])}
        onChange={(evento) => {
          cambiar(CLAVE_DEL_ALTA.tipoDeSeguimiento, evento.target.value)
        }}
        error={errores[CLAVE_DEL_ALTA.tipoDeSeguimiento]}
        ayuda={tipos.length === 0 ? 'No hay tipos de seguimiento activos.' : undefined}
        disabled={enCurso || tipos.length === 0}
      />
      <Campo
        nombre={idDe(CLAVE_DEL_ALTA.resumen)}
        etiqueta="Resumen"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_RESUMEN}
        value={texto(valores[CLAVE_DEL_ALTA.resumen])}
        onChange={(evento) => {
          cambiar(CLAVE_DEL_ALTA.resumen, evento.target.value)
        }}
        error={errores[CLAVE_DEL_ALTA.resumen]}
        disabled={enCurso}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={idDe(CLAVE_DEL_ALTA.detalle)}>Detalle (opcional)</Label>
        <Textarea
          id={idDe(CLAVE_DEL_ALTA.detalle)}
          name={idDe(CLAVE_DEL_ALTA.detalle)}
          rows={3}
          maxLength={LARGO_MAXIMO_DEL_DETALLE}
          aria-invalid={detalleError ? true : undefined}
          value={texto(valores[CLAVE_DEL_ALTA.detalle])}
          onChange={(evento) => {
            cambiar(CLAVE_DEL_ALTA.detalle, evento.target.value)
          }}
          disabled={enCurso}
        />
        {detalleError ? (
          <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{detalleError}</p>
        ) : null}
      </div>
      <Recordatorio alta={alta} zona={zona} />
    </div>
  )
}
