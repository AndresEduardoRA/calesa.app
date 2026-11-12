'use client'

import { useId } from 'react'
import { Campo } from '@/shared/ui/campo'
import { CambiosSinGuardar } from '@/shared/ui/cambios-sin-guardar'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import {
  MAXIMO_DEL_SLUG_DE_GUIA,
  MAXIMO_DEL_TITULO_DE_GUIA,
} from '../../../../entities/contenido/guias'
import { useCrearGuia } from '../hooks/use-crear-guia'

// El cuerpo del panel «Nueva guía»: título y dirección, con «Crear borrador» al pie. Va dentro del `<Drawer>` (su contexto recibe los cambios).
export function FormularioDeNuevaGuia({
  alCrear,
  alCancelar,
}: {
  alCrear: (id: string) => void
  alCancelar: () => void
}) {
  const formulario = useCrearGuia({ alCrear })
  const id = useId()
  return (
    <>
      <CambiosSinGuardar hayCambios={formulario.hayCambios} />
      <form
        id={id}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void formulario.enviar()
        }}
      >
        <fieldset disabled={formulario.enCurso} className="grid min-w-0 gap-4">
          <legend className="sr-only">Nueva guía</legend>
          <Campo
            nombre="titulo"
            etiqueta="Título"
            maxLength={MAXIMO_DEL_TITULO_DE_GUIA}
            autoFocus
            autoComplete="off"
            value={formulario.titulo}
            onChange={(evento) => {
              formulario.cambiarTitulo(evento.target.value)
            }}
            error={formulario.errores.titulo}
          />
          <Campo
            nombre="slug"
            etiqueta="Dirección"
            ayuda="Es la dirección de la guía en el sitio. Se arma con el título; puedes cambiarla."
            maxLength={MAXIMO_DEL_SLUG_DE_GUIA}
            autoComplete="off"
            value={formulario.slug}
            onChange={(evento) => {
              formulario.cambiarSlug(evento.target.value)
            }}
            error={formulario.errores.slug}
          />
        </fieldset>
      </form>
      <PieDelPanel
        idFormulario={id}
        enCurso={formulario.enCurso}
        alCancelar={alCancelar}
        etiquetaDeGuardar="Crear borrador"
        etiquetaEnCurso="Creando…"
      />
    </>
  )
}
