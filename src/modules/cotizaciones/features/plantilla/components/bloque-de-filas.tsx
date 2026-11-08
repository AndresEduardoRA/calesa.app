'use client'

import { useMemo, useState } from 'react'
import { Bloque } from '@/shared/ui/bloque'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { Plantilla } from '../../../entities/plantilla/forma-de-plantilla'
import { filtrarFilas, type FilasDelEditor } from '../../../entities/plantilla/filas-del-editor'
import { CampoConContador } from './campo-con-contador'

type Props = {
  filas: FilasDelEditor
  plantilla: Plantilla
  deshabilitado: boolean
  motivoDe: (donde: string) => string | undefined
  alCambiarEtiqueta: (id: string, texto: string) => void
  alCambiarLeyenda: (id: string, texto: string) => void
}

type Fila = { id: string; etiqueta: string; escrita: string; seccion: string }

const leer = (d: Readonly<Record<string, string>> | undefined, id: string): string =>
  d !== undefined && Object.hasOwn(d, id) ? (d[id] ?? '') : ''

// Todas las filas con su sección, en el orden de la tarjeta: los miembros de cada grupo, el total y lo aparte.
function filasPlanas(f: FilasDelEditor, p: Plantilla): Fila[] {
  const de = (n: { id: string; etiqueta: string }, seccion: string): Fila => ({
    ...n,
    seccion,
    escrita: leer(p.etiquetas, n.id),
  })
  return [
    ...f.grupos.flatMap((g) => g.miembros.map((m) => de(m, g.etiqueta))),
    ...(f.total === null ? [] : [de(f.total, 'Total')]),
    ...f.aparte.map((n) => de(n, 'Aparte')),
  ]
}

type PropsDeFila = {
  fila: Fila
  leyenda: string
  deshabilitado: boolean
  motivoDe: (donde: string) => string | undefined
  alCambiarEtiqueta: (id: string, texto: string) => void
  alCambiarLeyenda: (id: string, texto: string) => void
}

// La etiqueta y la leyenda de una fila: en pares desde `md`.
function FilaDeCampos({
  fila: f,
  leyenda,
  deshabilitado,
  motivoDe,
  alCambiarEtiqueta,
  alCambiarLeyenda,
}: PropsDeFila) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <CampoConContador
        nombre={`etiqueta-${f.id}`}
        donde={`etiquetas.${f.id}`}
        etiqueta={`Etiqueta de «${f.etiqueta}»`}
        valor={f.escrita}
        placeholder={f.etiqueta}
        tope={60}
        motivo={motivoDe(`etiquetas.${f.id}`)}
        deshabilitado={deshabilitado}
        alCambiar={(texto) => {
          alCambiarEtiqueta(f.id, texto)
        }}
      />
      <CampoConContador
        nombre={`leyenda-${f.id}`}
        donde={`leyendas.${f.id}`}
        etiqueta={`Leyenda de «${f.etiqueta}»`}
        valor={leyenda}
        tope={160}
        motivo={motivoDe(`leyendas.${f.id}`)}
        deshabilitado={deshabilitado}
        alCambiar={(texto) => {
          alCambiarLeyenda(f.id, texto)
        }}
      />
    </div>
  )
}

// «Filas»: la etiqueta y la leyenda de cada nodo de la tarjeta. «Buscar fila» filtra en el navegador sobre **todas** (el camino a lo que pasa del tope de 500); el texto
// buscado es del bloque, no de la plantilla: no es un cambio ni se guarda.
export function BloqueDeFilas({
  filas,
  plantilla,
  deshabilitado,
  motivoDe,
  alCambiarEtiqueta,
  alCambiarLeyenda,
}: Props) {
  const [buscado, setBuscado] = useState('')
  const todas = useMemo(() => filasPlanas(filas, plantilla), [filas, plantilla])
  const conMotivo = (id: string) =>
    motivoDe(`etiquetas.${id}`) !== undefined || motivoDe(`leyendas.${id}`) !== undefined
  const coinciden = filtrarFilas(todas, buscado, conMotivo)
  const visibles = coinciden.slice(0, TOPE_DE_LO_CARGADO)
  const secciones = [...new Set(visibles.map((f) => f.seccion))]
  return (
    <Bloque
      titulo="Filas"
      descripcion="La etiqueta y la leyenda de cada fila de la tarjeta."
      plegado
      forzarAbierto={todas.some((f) => conMotivo(f.id))}
    >
      <div className="grid gap-3">
        <div className="grid max-w-sm gap-1.5">
          <Label htmlFor="buscar-fila">Buscar fila</Label>
          <Input
            id="buscar-fila"
            type="search"
            className="h-11 md:h-9"
            value={buscado}
            onChange={(evento) => {
              setBuscado(evento.target.value)
            }}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') evento.preventDefault()
            }}
          />
        </div>
        {visibles.length === 0 ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Ninguna fila coincide con «{buscado.trim()}».
          </p>
        ) : null}
        {secciones.map((seccion) => (
          <Bloque
            key={seccion}
            titulo={seccion}
            plegado
            forzarAbierto={
              buscado.trim() !== '' ||
              visibles.some((f) => f.seccion === seccion && conMotivo(f.id))
            }
          >
            <div className="grid gap-3">
              {visibles
                .filter((f) => f.seccion === seccion)
                .map((f) => (
                  <FilaDeCampos
                    key={f.id}
                    fila={f}
                    leyenda={leer(plantilla.leyendas, f.id)}
                    deshabilitado={deshabilitado}
                    motivoDe={motivoDe}
                    alCambiarEtiqueta={alCambiarEtiqueta}
                    alCambiarLeyenda={alCambiarLeyenda}
                  />
                ))}
            </div>
          </Bloque>
        ))}
        {coinciden.length > TOPE_DE_LO_CARGADO ? (
          <AvisoDeTope
            texto={`Se muestran las ${TOPE_DE_LO_CARGADO} primeras filas. Escribe en «Buscar fila» para ver otras.`}
          />
        ) : null}
      </div>
    </Bloque>
  )
}
