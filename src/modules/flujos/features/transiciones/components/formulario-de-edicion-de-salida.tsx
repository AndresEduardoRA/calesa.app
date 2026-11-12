'use client'

import { useRef } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import type { FlujoParaConfigurar, TransicionParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import { rolesGuardadosDeSalida } from '../../../entities/transiciones/roles-de-lista'
import { nombreDelDestino } from '../../../entities/transiciones/vista-de-salidas'
import { useFormularioDeEdicionDeSalida } from '../hooks/use-formulario-de-edicion-de-salida'
import type { SalidasDeLaFase } from '../hooks/use-salidas-de-la-fase'
import { CamposDeSalida } from './campos-de-salida'
import { SelectorDeRoles } from './selector-de-roles'

type Props = {
  flujo: FlujoParaConfigurar
  salida: TransicionParaConfigurar
  salidas: SalidasDeLaFase
  roles: readonly RolLeido[]
  alCerrar: () => void
}

const BOTON = 'h-11 md:h-8'

// «Editar» una salida, en el lugar de su fila: la acción, la nota y quién puede mover por ella. El destino no cambia (se quita la salida y se crea otra). Un
// solo «Guardar» manda lo que cambió.
export function FormularioDeEdicionDeSalida({ flujo, salida, salidas, roles, alCerrar }: Props) {
  const f = useFormularioDeEdicionDeSalida({
    salidas,
    salida,
    rolesGuardados: rolesGuardadosDeSalida(flujo, salida.id),
    alCerrar,
  })
  const referencia = useRef<HTMLFormElement>(null)
  useCambiosSinGuardar(f.hayCambios, undefined, { preguntaAlCerrar: true })

  return (
    <form
      ref={referencia}
      aria-label="Editar salida"
      noValidate
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void f.enviar(referencia.current)
      }}
    >
      <p className="text-(length:--text-sm) font-medium break-words text-(--color-ink)">
        Salida a {nombreDelDestino(flujo, salida)}
      </p>
      <p className="text-(length:--text-xs) text-(--color-ink-soft)">
        El destino no cambia: para otro destino quita la salida y crea otra.
      </p>
      <CamposDeSalida
        autoFocus
        accion={f.valores.accion}
        notaObligatoria={f.valores.notaObligatoria}
        error={f.errores.accion}
        deshabilitado={f.enCurso}
        alCambiarAccion={(accion) => {
          f.escribir({ accion }, 'accion')
        }}
        alCambiarNota={(notaObligatoria) => {
          f.escribir({ notaObligatoria }, 'de_fase_id')
        }}
      />
      <SelectorDeRoles
        legend="Quién puede mover por esta salida"
        ayuda="Vacío: la lista de la fase destino."
        roles={roles}
        marcados={f.roles}
        alMarcar={f.marcarRol}
        deshabilitado={f.enCurso}
        error={f.errores.roles}
      />
      {f.aviso === null ? null : <Aviso tono="peligro">{f.aviso}</Aviso>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className={BOTON} disabled={f.enCurso || !f.hayCambios}>
          {f.enCurso ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={BOTON}
          disabled={f.enCurso}
          onClick={alCerrar}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
