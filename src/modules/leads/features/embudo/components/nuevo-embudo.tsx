'use client'

import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Modal } from '@/shared/ui/modal'
import { LARGO_MAXIMO_DE_EMBUDO, MAXIMO_DE_EMBUDOS, type Embudo } from '../../../entities/embudo'
import { useNuevoEmbudo } from '../hooks/use-nuevo-embudo'

type Props = {
  embudos: readonly Embudo[]
  alCerrar: () => void
  alCrear: (id: string) => void
}

// «Nuevo embudo» (`?panel=nuevo-embudo`): el nombre y listo. Nace con tres etapas (Nueva, Ganada y
// Perdida) que se editan después en «Etapas».
export function NuevoEmbudo({ embudos, alCerrar, alCrear }: Props) {
  const id = useId()
  const nuevo = useNuevoEmbudo(embudos, alCrear)
  const lleno = embudos.length >= MAXIMO_DE_EMBUDOS
  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo="Nuevo embudo"
      descripcion={
        lleno
          ? `Puedes tener hasta ${String(MAXIMO_DE_EMBUDOS)} embudos. Elimina uno para crear otro.`
          : 'Nace con tres etapas: Nueva, Ganada y Perdida. Las cambias después en «Etapas».'
      }
      pie={
        <>
          <Button variant="ghost" onClick={alCerrar} disabled={nuevo.enCurso}>
            Cancelar
          </Button>
          <Button type="submit" form={id} disabled={nuevo.enCurso || lleno}>
            {nuevo.enCurso ? 'Creando…' : 'Crear embudo'}
          </Button>
        </>
      }
    >
      <form
        id={id}
        className="grid gap-1.5"
        onSubmit={(evento) => {
          evento.preventDefault()
          void nuevo.enviar()
        }}
      >
        <Label htmlFor={`${id}-nombre`}>Nombre</Label>
        <Input
          id={`${id}-nombre`}
          value={nuevo.nombre}
          maxLength={LARGO_MAXIMO_DE_EMBUDO + 10}
          disabled={lleno}
          aria-invalid={nuevo.motivo ? true : undefined}
          aria-describedby={nuevo.motivo ? `${id}-motivo` : undefined}
          className="h-11 md:h-9"
          onChange={(evento) => {
            nuevo.setNombre(evento.target.value)
          }}
        />
        {nuevo.motivo ? (
          <p
            id={`${id}-motivo`}
            role="alert"
            className="text-(length:--text-xs) text-(--color-peligro-ink)"
          >
            {nuevo.motivo}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
