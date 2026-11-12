'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError } from '@/shared/ui/toasts'
import { slugDe } from '../../../../entities/contenido/guias'
import { crearGuia } from '../actions/crear-guia'

type Errores = Partial<Record<'titulo' | 'slug', string>>

// «Nueva guía»: el título y la dirección. La dirección sigue al título hasta que la persona la toca; al crear, va a la página de la guía.
// Lo escrito queda siempre: un error se dice junto a su campo (la dirección repetida, junto a la dirección).
export function useCrearGuia({ alCrear }: { alCrear: (id: string) => void }) {
  const { executeAsync, result, isPending } = useAction(crearGuia)
  const [titulo, setTitulo] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTocado, setSlugTocado] = useState(false)
  const [delServidor, setDelServidor] = useState<Errores>({})

  async function enviar(): Promise<void> {
    setDelServidor({})
    const respuesta = await conRed(executeAsync({ titulo, slug }))
    const resultado = resultadoDeAccion(respuesta)
    if (resultado.ok) {
      alCrear(resultado.data.id)
      return
    }
    const delCampo =
      respuesta.data && 'porCampo' in respuesta.data ? respuesta.data.porCampo : undefined
    if (delCampo) {
      setDelServidor(delCampo)
    } else if (resultado.error.codigo !== 'validacion') {
      avisarError(resultado.error)
    }
  }

  const deValidacion = result.validationErrors?.fieldErrors
  return {
    titulo,
    slug,
    cambiarTitulo: (texto: string) => {
      setTitulo(texto)
      if (!slugTocado) {
        setSlug(slugDe(texto))
      }
    },
    cambiarSlug: (texto: string) => {
      setSlugTocado(true)
      setSlug(texto)
    },
    enviar,
    enCurso: isPending,
    hayCambios: titulo !== '' || slug !== '',
    errores: {
      titulo: delServidor.titulo ?? deValidacion?.titulo?.[0],
      slug: delServidor.slug ?? deValidacion?.slug?.[0],
    } satisfies Errores,
  }
}
