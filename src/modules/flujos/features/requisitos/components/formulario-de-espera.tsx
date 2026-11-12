'use client'

import { useRef } from 'react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { TOPE_DE_FASES_PARA_REQUISITOS } from '../../../entities/requisitos/opciones'
import { useFormularioDeEspera } from '../hooks/use-formulario-de-espera'
import type { RequisitosDeLaFase } from '../hooks/use-requisitos-de-la-fase'
import { CampoDeNotas } from './campo-de-notas'
import { PieDeFormulario } from './pie-de-formulario'

type Props = {
  flujo: FlujoParaConfigurar
  requisitos: RequisitosDeLaFase
  alCerrar: () => void
}

// Qué espera cada ámbito: un vehículo a sus repuestos y un repuesto a su vehículo (la base fija el ámbito de la espera).
function ayudaDe(ambito: FlujoParaConfigurar['ambito']): string {
  return ambito === 'vehiculos'
    ? 'El vehículo espera a que sus repuestos lleguen a esta fase.'
    : 'El repuesto espera a que su vehículo llegue a esta fase.'
}

// «Agregar requisito» de forma «Espera», en línea en el bloque del inspector: la fase del otro flujo que se espera y las notas. Con la regla «Esperas» apagada
// la base lo rechaza junto al campo. Nace informativo.
export function FormularioDeEspera({ flujo, requisitos, alCerrar }: Props) {
  const opciones = requisitos.opciones
  const leidas = opciones.opciones
  const fases = leidas?.fases ?? []
  const f = useFormularioDeEspera({ requisitos, fases, alCerrar })
  const referencia = useRef<HTMLFormElement>(null)
  useCambiosSinGuardar(f.hayCambios, undefined, { preguntaAlCerrar: true })
  const { valores, errores } = f
  // Con varios flujos de origen (repuestos → vehículos) cada fase dice el suyo.
  const variosFlujos = new Set(fases.map((fase) => fase.flujo)).size > 1
  const sinFases = leidas !== null && fases.length === 0
  const sinEnvio = opciones.fallo || sinFases

  return (
    <form
      ref={referencia}
      aria-label="Agregar requisito de espera"
      noValidate
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void f.enviar(referencia.current)
      }}
    >
      {sinEnvio ? null : (
        <CampoSeleccion
          nombre="espera_fase_id"
          etiqueta="Fase que se espera"
          autoFocus
          disabled={leidas === null}
          value={valores.faseId}
          opciones={[
            { valor: '', etiqueta: leidas === null ? 'Leyendo fases…' : 'Elige una fase' },
            ...fases.map((fase) => ({
              valor: fase.id,
              etiqueta: variosFlujos ? `${fase.nombre} · ${fase.flujo}` : fase.nombre,
            })),
          ]}
          onChange={(evento) => {
            f.escribir({ faseId: evento.target.value }, 'espera_fase_id')
          }}
          error={errores.espera_fase_id}
          ayuda={ayudaDe(flujo.ambito)}
        />
      )}
      {leidas?.fasesTruncado ? (
        <AvisoDeTope
          texto={`Se muestran las primeras ${String(TOPE_DE_FASES_PARA_REQUISITOS)} fases del otro flujo.`}
        />
      ) : null}
      {sinFases ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          El otro flujo no tiene fases activas.
        </p>
      ) : null}
      {opciones.fallo ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          No pudimos leer las fases. Reintenta desde el aviso de arriba.
        </p>
      ) : null}
      {sinEnvio ? null : (
        <CampoDeNotas
          valor={valores.notas}
          error={errores.notas}
          alEscribir={(notas) => {
            f.escribir({ notas }, 'notas')
          }}
        />
      )}
      <PieDeFormulario
        aviso={f.aviso}
        enCurso={f.enCurso}
        etiqueta="Agregar requisito"
        etiquetaEnCurso="Agregando…"
        sinEnvio={sinEnvio}
        alCerrar={alCerrar}
      />
    </form>
  )
}
