'use client'

import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Bloque } from '@/shared/ui/bloque'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_OPCIONES_DE_GUIA, type OpcionesDeGuia } from '../../../../entities/contenido/guias'
import type { ErroresDeGuia } from '../hooks/use-guardar-guia'
import type { ValoresDeGuia } from '../hooks/valores-de-guia'
import { CampoDePortada } from './campo-de-portada'

type Props = {
  valores: ValoresDeGuia
  cambiar: (cambios: Partial<ValoresDeGuia>) => void
  errores: ErroresDeGuia
  opciones: OpcionesDeGuia
  deshabilitado: boolean
}

// Categoría, autor y portada. Las listas se leyeron con tope + 1: si hay más, lo dice.
export function BloqueDatos({ valores, cambiar, errores, opciones, deshabilitado }: Props) {
  return (
    <Bloque titulo="Datos" descripcion="Cómo se clasifica y se presenta la guía en el sitio.">
      <CampoSeleccion
        nombre="categoriaId"
        etiqueta="Categoría"
        opciones={[
          { valor: '', etiqueta: 'Sin categoría' },
          ...opciones.categorias.map((c) => ({
            valor: c.id,
            etiqueta: c.activa ? c.nombre : `${c.nombre} (desactivada)`,
          })),
        ]}
        ayuda={
          opciones.categorias.length === 0
            ? 'Todavía no hay categorías. Se crean desde «Categorías» en Guías.'
            : undefined
        }
        value={valores.categoriaId}
        onChange={(evento) => {
          cambiar({ categoriaId: evento.target.value })
        }}
        error={errores['categoriaId']}
      />
      {opciones.hayMasCategorias ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_OPCIONES_DE_GUIA, {
            sustantivo: 'categorías',
            articulo: 'las',
            orden: 'primeras por orden',
          })}
        />
      ) : null}
      <CampoSeleccion
        nombre="autorId"
        etiqueta="Autor"
        opciones={[
          { valor: '', etiqueta: 'Sin autor' },
          ...opciones.autores.map((a) => ({ valor: a.id, etiqueta: a.nombre })),
        ]}
        ayuda="Su nombre sólo se ve en la web si su perfil es público."
        value={valores.autorId}
        onChange={(evento) => {
          cambiar({ autorId: evento.target.value })
        }}
        error={errores['autorId']}
      />
      {opciones.hayMasAutores ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_OPCIONES_DE_GUIA, {
            sustantivo: 'personas',
            articulo: 'las',
            orden: 'primeras por nombre',
          })}
        />
      ) : null}
      <CampoDePortada
        ruta={valores.portadaRuta}
        alCambiar={(portadaRuta) => {
          cambiar({ portadaRuta })
        }}
        deshabilitado={deshabilitado}
      />
      {errores['portadaRuta'] ? (
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {errores['portadaRuta']}
        </p>
      ) : null}
    </Bloque>
  )
}
