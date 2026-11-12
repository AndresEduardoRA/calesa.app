'use client'

import { useId } from 'react'
import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import {
  LARGO_DE_CIUDAD,
  LARGO_DE_CLIENTE,
  LARGO_DE_TEXTO,
  LARGO_DE_VEHICULO,
  motivoSinPublicar,
  puedePublicar,
} from '../../../../entities/contenido/testimonios'
import type { useFormularioDeTestimonio } from '../hooks/use-formulario-de-testimonio'
import { CampoFotoDeTestimonio } from './campo-foto-de-testimonio'

type Props = { formulario: ReturnType<typeof useFormularioDeTestimonio> }

const AYUDA_PUBLICADO = 'Un testimonio publicado se ve en la web pública.'

// Los campos de un testimonio: cliente, ciudad, vehículo, texto (plano), foto y «Publicado». Éste va apagado, con su motivo, mientras no haya un
// consentimiento vigente (un testimonio nuevo nunca lo tiene).
export function CamposDeTestimonio({ formulario: f }: Props) {
  const idDelTexto = useId()
  const motivo = f.original ? motivoSinPublicar(f.original) : 'Falta registrar el consentimiento.'
  const puede = f.original !== null && puedePublicar(f.original)
  return (
    <>
      <Campo
        nombre="cliente"
        etiqueta="Cliente"
        autoComplete="off"
        maxLength={LARGO_DE_CLIENTE + 20}
        value={f.valores.cliente}
        error={f.errores['cliente']}
        onChange={(evento) => {
          f.cambiar({ cliente: evento.target.value })
        }}
      />
      <Campo
        nombre="ciudad"
        etiqueta="Ciudad (opcional)"
        autoComplete="off"
        maxLength={LARGO_DE_CIUDAD + 20}
        value={f.valores.ciudad}
        error={f.errores['ciudad']}
        onChange={(evento) => {
          f.cambiar({ ciudad: evento.target.value })
        }}
      />
      <Campo
        nombre="vehiculo"
        etiqueta="Vehículo (opcional)"
        autoComplete="off"
        maxLength={LARGO_DE_VEHICULO + 20}
        value={f.valores.vehiculo}
        error={f.errores['vehiculo']}
        onChange={(evento) => {
          f.cambiar({ vehiculo: evento.target.value })
        }}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={idDelTexto}>Testimonio</Label>
        <Textarea
          id={idDelTexto}
          name="texto"
          rows={5}
          maxLength={LARGO_DE_TEXTO + 100}
          value={f.valores.texto}
          aria-invalid={f.errores['texto'] ? true : undefined}
          aria-describedby={`${idDelTexto}-ayuda`}
          onChange={(evento) => {
            f.cambiar({ texto: evento.target.value })
          }}
        />
        {f.errores['texto'] ? (
          <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{f.errores['texto']}</p>
        ) : null}
        <p id={`${idDelTexto}-ayuda`} className="text-(length:--text-sm) text-(--color-ink-faint)">
          Se muestra tal como lo escribes, sin formato.
        </p>
      </div>
      <CampoFotoDeTestimonio
        rutaActual={f.original?.fotoRuta ?? null}
        archivo={f.foto.archivo}
        quitada={f.foto.quitada}
        error={f.errores['foto']}
        alElegir={f.elegirFoto}
        alQuitar={f.quitarFoto}
      />
      <Interruptor
        titulo="Publicado"
        ayuda={puede ? AYUDA_PUBLICADO : (motivo ?? AYUDA_PUBLICADO)}
        valor={f.valores.publicado}
        deshabilitado={!puede}
        alCambiar={(publicado) => {
          f.cambiar({ publicado })
        }}
      />
    </>
  )
}
