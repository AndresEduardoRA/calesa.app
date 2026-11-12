'use client'

import { useRef } from 'react'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import {
  CLAVE_CON_PORCENTAJE,
  ETIQUETA_DE_REGLA,
  etiquetaDeClave,
  reglaDeLaClave,
} from '../../../entities/requisitos/claves'
import { clavesQueFaltan } from '../../../entities/requisitos/vista-de-fase'
import { useFormularioDeDato } from '../hooks/use-formulario-de-dato'
import type { RequisitosDeLaFase } from '../hooks/use-requisitos-de-la-fase'
import { CampoDeNotas } from './campo-de-notas'
import { PieDeFormulario } from './pie-de-formulario'

type Props = {
  flujo: FlujoParaConfigurar
  requisitos: RequisitosDeLaFase
  alCerrar: () => void
}

// La nota bajo el selector cuando la clave elegida depende de una regla del flujo que está apagada (D1): se ofrece igual, y se dice que nadie podrá cumplirla.
function notaDeRegla(flujo: FlujoParaConfigurar, clave: string): string | null {
  const regla = reglaDeLaClave(clave)
  if (regla === null) {
    return null
  }
  const activa = flujo.reglas.find((r) => r.regla === regla)?.activa ?? false
  return activa
    ? null
    : `La regla «${ETIQUETA_DE_REGLA[regla] ?? regla}» está apagada: nadie podrá cumplirlo.`
}

// «Agregar requisito» de forma «Dato», en línea dentro del bloque del inspector (un modal no abre otro modal): un selector con las claves del ámbito del flujo
// que la fase aún no pide, el porcentaje si la clave es `pagos.umbral_pct` y las notas. Nace informativo. Los motivos van junto a su campo.
export function FormularioDeDato({ flujo, requisitos, alCerrar }: Props) {
  const f = useFormularioDeDato({ requisitos, ambito: flujo.ambito, alCerrar })
  const referencia = useRef<HTMLFormElement>(null)
  useCambiosSinGuardar(f.hayCambios, undefined, { preguntaAlCerrar: true })
  const { valores, errores } = f
  const claves = clavesQueFaltan(flujo.ambito, requisitos.requisitos)
  const nota = valores.clave === '' ? null : notaDeRegla(flujo, valores.clave)

  return (
    <form
      ref={referencia}
      aria-label="Agregar requisito de dato"
      noValidate
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void f.enviar(referencia.current)
      }}
    >
      <CampoSeleccion
        nombre="clave_dato"
        etiqueta="Dato que se pide"
        autoFocus
        value={valores.clave}
        opciones={[
          { valor: '', etiqueta: 'Elige un dato' },
          ...claves.map((clave) => ({ valor: clave, etiqueta: etiquetaDeClave(clave) })),
        ]}
        onChange={(evento) => {
          f.escribir({ clave: evento.target.value }, 'clave_dato')
        }}
        error={errores.clave_dato}
        ayuda={nota ?? undefined}
      />
      {valores.clave === CLAVE_CON_PORCENTAJE ? (
        <Campo
          nombre="config"
          etiqueta="Porcentaje del precio"
          inputMode="decimal"
          autoComplete="off"
          value={valores.porcentaje}
          onChange={(evento) => {
            f.escribir({ porcentaje: evento.target.value }, 'config')
          }}
          error={errores.config}
          ayuda="Cuánto del precio debe estar pagado, de 1 a 100."
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
        etiqueta="Agregar requisito"
        etiquetaEnCurso="Agregando…"
        alCerrar={alCerrar}
      />
    </form>
  )
}
