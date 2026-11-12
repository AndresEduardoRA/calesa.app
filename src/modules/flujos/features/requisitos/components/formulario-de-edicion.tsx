'use client'

import { useRef } from 'react'
import { Campo } from '@/shared/ui/campo'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import type { RequisitoParaConfigurar } from '../../../entities/flujo'
import { camposEditables } from '../../../entities/requisitos/formulario-de-edicion'
import type { TipoParaRequisito } from '../../../entities/requisitos/opciones'
import { useFormularioDeEdicion } from '../hooks/use-formulario-de-edicion'
import type { RequisitosDeLaFase } from '../hooks/use-requisitos-de-la-fase'
import { CampoDeNotas } from './campo-de-notas'
import { CamposDeArchivos } from './campos-de-archivos'
import { PieDeFormulario } from './pie-de-formulario'

type Props = {
  requisitos: RequisitosDeLaFase
  requisito: RequisitoParaConfigurar
  // Qué requisito es, dicho como en la lista (sólo lectura).
  descripcion: string
  tipo: TipoParaRequisito | null
  alCerrar: () => void
}

// «Editar» un requisito, en línea en el lugar de «Agregar requisito»: sólo lo que la base guarda de cada tipo (el porcentaje de pagos; el mínimo, el máximo y los
// formatos de un documento; las notas de todos). No cambia la clave, el tipo ni «Bloqueante». El `key` de quien lo monta (el id) reinicia lo escrito al cambiar de requisito.
export function FormularioDeEdicion({ requisitos, requisito, descripcion, tipo, alCerrar }: Props) {
  const f = useFormularioDeEdicion({ requisitos, requisito, tipo, alCerrar })
  const referencia = useRef<HTMLFormElement>(null)
  useCambiosSinGuardar(f.hayCambios, undefined, { preguntaAlCerrar: true })
  const { valores, errores } = f
  const editables = camposEditables(requisito)

  return (
    <form
      ref={referencia}
      aria-label="Editar requisito"
      noValidate
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void f.enviar(referencia.current)
      }}
    >
      <p className="text-(length:--text-sm) font-medium break-words">{descripcion}</p>
      {editables.porcentaje ? (
        <Campo
          nombre="config"
          etiqueta="Porcentaje del precio"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          value={valores.porcentaje}
          onChange={(evento) => {
            f.escribir({ porcentaje: evento.target.value }, 'config')
          }}
          error={errores.config}
          ayuda="Cuánto del precio debe estar pagado, de 1 a 100."
        />
      ) : null}
      {editables.archivos ? (
        <CamposDeArchivos
          valores={valores}
          errores={errores}
          formatosDelTipo={tipo?.formatos ?? null}
          motivoSinFormatos="No pudimos leer los formatos del tipo."
          alEscribir={f.escribir}
        />
      ) : null}
      <CampoDeNotas
        valor={valores.notas}
        error={errores.notas}
        alEscribir={(notas) => {
          f.escribir({ notas }, 'notas')
        }}
      />
      <PieDeFormulario
        aviso={f.aviso}
        enCurso={f.enCurso}
        etiqueta="Guardar"
        etiquetaEnCurso="Guardando…"
        alCerrar={alCerrar}
      />
    </form>
  )
}
