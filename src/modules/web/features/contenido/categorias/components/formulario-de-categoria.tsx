'use client'

import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { Campo } from '@/shared/ui/campo'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import {
  MAXIMO_DEL_NOMBRE_DE_CATEGORIA,
  type CategoriaDeGuia,
} from '../../../../entities/contenido/categorias'

type Props = {
  nombre: string
  alCambiar: (texto: string) => void
  // La categoría que se está renombrando, o nulo si el formulario agrega una.
  editando: CategoriaDeGuia | null
  error: string | undefined
  enCurso: boolean
  alEnviar: () => void
  alCancelar: () => void
}

// El nombre de la categoría: «Agregar» al final, o «Guardar» sobre una que se renombra. Va dentro del `<Drawer>` (su contexto recibe lo escrito).
export function FormularioDeCategoria({
  nombre,
  alCambiar,
  editando,
  error,
  enCurso,
  alEnviar,
  alCancelar,
}: Props) {
  const id = useId()
  const enLinea = useEnLinea()
  return (
    <>
      <CambiosSinGuardar hayCambios={nombre.trim() !== '' && nombre !== (editando?.nombre ?? '')} />
      <form
        id={id}
        noValidate
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          alEnviar()
        }}
      >
        <Campo
          nombre="nombre-de-categoria"
          etiqueta={editando ? `Renombrar «${editando.nombre}»` : 'Nombre'}
          maxLength={MAXIMO_DEL_NOMBRE_DE_CATEGORIA}
          autoComplete="off"
          value={nombre}
          onChange={(evento) => {
            alCambiar(evento.target.value)
          }}
          error={error}
          disabled={enCurso}
        />
        <div className="flex flex-wrap justify-end gap-2">
          {editando ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 md:min-h-9"
              onClick={alCancelar}
              disabled={enCurso}
            >
              Cancelar
            </Button>
          ) : null}
          <Button type="submit" className="min-h-11 md:min-h-9" disabled={enCurso || !enLinea}>
            {editando ? 'Guardar' : 'Agregar'}
          </Button>
        </div>
        {enLinea ? null : (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">No hay conexión.</p>
        )}
      </form>
    </>
  )
}
