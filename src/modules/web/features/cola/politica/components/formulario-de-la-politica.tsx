'use client'

import { useRef, useState } from 'react'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { LIMITES_DE_LA_POLITICA, type PoliticaDeLaCola } from '../../../../entities/cola/politica'
import { useGuardarPolitica } from '../hooks/use-guardar-politica'

export type PropsDelFormularioDeLaPolitica = { politica: PoliticaDeLaCola }

type Numerica = 'ttlContactoMinutos' | 'diasPegajoso' | 'maxAbiertasDefault' | 'maxIntentos'

const CAMPOS: readonly { clave: Numerica; etiqueta: string; ayuda: string }[] = [
  {
    clave: 'ttlContactoMinutos',
    etiqueta: 'Minutos para contactar',
    ayuda: 'Lo que tiene el asesor antes de que el turno pase a otro.',
  },
  {
    clave: 'diasPegajoso',
    etiqueta: 'Días con el mismo asesor',
    ayuda: 'Quien vuelve dentro de estos días va al asesor que ya lo atendió.',
  },
  {
    clave: 'maxAbiertasDefault',
    etiqueta: 'Cupo por defecto',
    ayuda: 'Solicitudes abiertas por asesor cuando no tiene un cupo propio.',
  },
  {
    clave: 'maxIntentos',
    etiqueta: 'Intentos por solicitud',
    ayuda: 'Cuántos asesores reciben la solicitud, uno tras otro, si nadie la contacta a tiempo.',
  },
]

function textosDe(politica: PoliticaDeLaCola): Record<Numerica, string> {
  return {
    ttlContactoMinutos: String(politica.ttlContactoMinutos),
    diasPegajoso: String(politica.diasPegajoso),
    maxAbiertasDefault: String(politica.maxAbiertasDefault),
    maxIntentos: String(politica.maxIntentos),
  }
}

function numeroDe(texto: string): number {
  return texto.trim() === '' ? Number.NaN : Number(texto)
}

// La política de la cola (8.04-3): si reparte turnos, cuánto tiene cada asesor para contactar, el pegajoso, el cupo por defecto y los intentos. Cinco
// campos: sin borrador. Quien lo monta le da la versión como `key`: guardar o recargar lo vuelve a montar con lo nuevo.
export function FormularioDeLaPolitica({ politica }: PropsDelFormularioDeLaPolitica) {
  const formulario = useRef<HTMLFormElement>(null)
  const [colaActiva, setColaActiva] = useState(politica.colaActiva)
  const [textos, setTextos] = useState(textosDe(politica))
  const g = useGuardarPolitica(politica.actualizadoEn)
  const original = textosDe(politica)
  const hayCambios =
    colaActiva !== politica.colaActiva ||
    CAMPOS.some(({ clave }) => textos[clave] !== original[clave])
  return (
    <form
      ref={formulario}
      className="grid gap-4"
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void g.guardar(
          {
            colaActiva,
            ttlContactoMinutos: numeroDe(textos.ttlContactoMinutos),
            diasPegajoso: numeroDe(textos.diasPegajoso),
            maxAbiertasDefault: numeroDe(textos.maxAbiertasDefault),
            maxIntentos: numeroDe(textos.maxIntentos),
          },
          formulario.current,
        )
      }}
    >
      {g.conflicto ? <AvisoDeConflicto mensaje={g.conflicto} alRecargar={g.recargar} /> : null}
      <Interruptor
        titulo="La cola reparte turnos"
        ayuda="Apagada, la rueda no reparte turnos nuevos."
        valor={colaActiva}
        alCambiar={setColaActiva}
      />
      {CAMPOS.map(({ clave, etiqueta, ayuda }) => (
        <Campo
          key={clave}
          nombre={clave}
          etiqueta={etiqueta}
          type="number"
          inputMode="numeric"
          min={LIMITES_DE_LA_POLITICA[clave].min}
          max={LIMITES_DE_LA_POLITICA[clave].max}
          ayuda={`${ayuda} De ${LIMITES_DE_LA_POLITICA[clave].min} a ${LIMITES_DE_LA_POLITICA[clave].max}.`}
          value={textos[clave]}
          error={g.errores[clave]}
          onChange={(evento) => {
            setTextos({ ...textos, [clave]: evento.target.value })
          }}
        />
      ))}
      <div>
        <Button type="submit" className="h-11 md:h-9" disabled={!hayCambios || g.enCurso}>
          {g.enCurso ? 'Guardando…' : 'Guardar política'}
        </Button>
      </div>
    </form>
  )
}
