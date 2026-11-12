'use client'

import { useRef } from 'react'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { tiposActivos } from '../../../entities/requisitos/vista-de-fase'
import { useFormularioDeDocumento } from '../hooks/use-formulario-de-documento'
import type { RequisitosDeLaFase } from '../hooks/use-requisitos-de-la-fase'
import { CampoDeNotas } from './campo-de-notas'
import { CampoDeTipoDeDocumento } from './campo-de-tipo-de-documento'
import { CamposDeArchivos } from './campos-de-archivos'
import { PieDeFormulario } from './pie-de-formulario'

type Props = {
  requisitos: RequisitosDeLaFase
  alCerrar: () => void
}

// «Agregar requisito» de forma «Documento», en línea en el bloque del inspector: el tipo de documento (sólo los activos), cuántos archivos y en qué formatos
// (los del tipo) y las notas. Nace informativo. Si la lectura de los tipos falló o no hay tipos activos, no hay qué enviar.
export function FormularioDeDocumento({ requisitos, alCerrar }: Props) {
  const { opciones, fallo } = requisitos.opciones
  const tipos = opciones === null ? null : tiposActivos(opciones.tipos)
  const f = useFormularioDeDocumento({ requisitos, tipos: tipos ?? [], alCerrar })
  const referencia = useRef<HTMLFormElement>(null)
  useCambiosSinGuardar(f.hayCambios, undefined, { preguntaAlCerrar: true })
  const { valores, errores } = f
  const sinEnvio = fallo || tipos?.length === 0

  return (
    <form
      ref={referencia}
      aria-label="Agregar requisito de documento"
      noValidate
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void f.enviar(referencia.current)
      }}
    >
      {fallo ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          No pudimos leer los tipos de documento. Reintenta desde el aviso de arriba.
        </p>
      ) : (
        <CampoDeTipoDeDocumento
          tipos={tipos}
          valor={valores.tipoId}
          error={errores.tipo_documento_id}
          alElegir={f.elegirTipo}
        />
      )}
      {sinEnvio ? null : (
        <>
          <CamposDeArchivos
            valores={valores}
            errores={errores}
            formatosDelTipo={tipos?.find((t) => t.id === valores.tipoId)?.formatos ?? null}
            motivoSinFormatos="Elige primero el tipo de documento."
            alEscribir={f.escribir}
          />
          <CampoDeNotas
            valor={valores.notas}
            error={errores.notas}
            alEscribir={(notas) => {
              f.escribir({ notas }, 'notas')
            }}
          />
        </>
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
