'use client'

import { codigoDictado, textoParaWhatsApp } from '../../../entities/portal-mensaje'
import type { Otorgado } from '../hooks/use-otorgar-portal'
import { BotonCopiar } from './boton-copiar'

type Props = {
  otorgado: Otorgado
  leadNombre: string
  empresa: string
  // La dirección pública de la web; nula si no está configurada.
  direccion: string | null
}

// Lo que se le pasa al cliente, una sola vez: el código en grande y dictable, la clave y el texto listo
// para WhatsApp. Al cerrar el diálogo se olvida.
export function AccesoOtorgado({ otorgado, leadNombre, empresa, direccion }: Props) {
  const texto = textoParaWhatsApp({
    cliente: leadNombre,
    empresa,
    codigo: otorgado.codigo,
    clave: otorgado.clave,
    direccion,
  })
  return (
    <div className="grid gap-4">
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        La clave se muestra sólo esta vez: cópiala o díctala ahora.
      </p>
      <div className="grid justify-items-center gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface-2) p-4 text-center">
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">Código</span>
        <output
          aria-label={`Código: ${otorgado.codigo}`}
          className="font-mono text-(length:--text-2xl) font-semibold tracking-[0.15em] break-all text-(--color-ink) select-all"
        >
          {otorgado.codigo}
        </output>
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">
          Se dice: {codigoDictado(otorgado.codigo)}
        </p>
        <BotonCopiar texto={otorgado.codigo} etiqueta="Copiar código" />
      </div>
      <div className="grid justify-items-center gap-1 text-center">
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">Clave temporal</span>
        <output
          aria-label="Clave temporal"
          className="font-mono text-(length:--text-xl) font-semibold tracking-widest break-all text-(--color-ink) select-all"
        >
          {otorgado.clave}
        </output>
        {otorgado.generada ? (
          <p className="text-(length:--text-xs) text-(--color-ink-soft)">
            Se dice: {codigoDictado(otorgado.clave)}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
          Texto para WhatsApp
        </span>
        <pre
          aria-label="Texto para WhatsApp"
          className="rounded-(--radius-md) bg-(--color-surface-2) p-3 font-sans text-(length:--text-sm) whitespace-pre-wrap text-(--color-ink) select-all"
        >
          {texto}
        </pre>
        {direccion ? null : (
          <p className="text-(length:--text-xs) text-(--color-ink-soft)">
            Todavía no hay una dirección de la web configurada: el texto va sin enlace.
          </p>
        )}
        <div>
          <BotonCopiar texto={texto} etiqueta="Copiar texto" />
        </div>
      </div>
    </div>
  )
}
