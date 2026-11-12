'use client'

import { useRef } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Interruptor } from '@/shared/ui/interruptor'
import { LARGO_MAXIMO_DE_ACCION } from '../../../entities/transiciones/formulario-de-salida'
import { useFormularioDeSalida } from '../hooks/use-formulario-de-salida'
import type { SalidasDeLaFase } from '../hooks/use-salidas-de-la-fase'

type Props = { salidas: SalidasDeLaFase; alCerrar: () => void }

const BOTON = 'h-11 md:h-8'

// «Agregar salida», en línea dentro del bloque del inspector (un modal no abre otro modal): la fase de destino (sólo las que aún no son salida), la acción
// que dirá el botón al mover y si pide nota. Los motivos van junto a su campo.
export function FormularioDeNuevaSalida({ salidas, alCerrar }: Props) {
  const f = useFormularioDeSalida({ salidas, alCerrar })
  const referencia = useRef<HTMLFormElement>(null)
  useCambiosSinGuardar(f.hayCambios, undefined, { preguntaAlCerrar: true })
  const { valores, errores } = f

  return (
    <form
      ref={referencia}
      aria-label="Agregar salida"
      noValidate
      className="grid gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void f.enviar(referencia.current)
      }}
    >
      <CampoSeleccion
        nombre="a_fase_id"
        etiqueta="Fase de destino"
        autoFocus
        value={valores.aFaseId}
        opciones={[
          { valor: '', etiqueta: 'Elige una fase' },
          ...salidas.destinos.map((fase) => ({ valor: fase.id, etiqueta: fase.nombre })),
        ]}
        onChange={(evento) => {
          f.escribir({ aFaseId: evento.target.value }, 'a_fase_id')
        }}
        error={errores.a_fase_id}
      />
      <Campo
        nombre="accion"
        etiqueta="Acción"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DE_ACCION * 2}
        value={valores.accion}
        onChange={(evento) => {
          f.escribir({ accion: evento.target.value }, 'accion')
        }}
        error={errores.accion}
        ayuda="Lo que dirá el botón al mover, por ejemplo «Embarcar». Vacío dice «Mover»."
      />
      <Interruptor
        titulo="Pide nota al mover"
        ayuda="Quien mueva por esta salida tendrá que escribir una nota."
        valor={valores.notaObligatoria}
        alCambiar={(valor) => {
          f.escribir({ notaObligatoria: valor }, 'de_fase_id')
        }}
        deshabilitado={f.enCurso}
      />
      {f.aviso === null ? null : <Aviso tono="peligro">{f.aviso}</Aviso>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className={BOTON} disabled={f.enCurso}>
          {f.enCurso ? 'Agregando…' : 'Agregar salida'}
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
