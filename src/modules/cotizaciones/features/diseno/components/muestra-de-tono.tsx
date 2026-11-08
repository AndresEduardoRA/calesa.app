import type { ColoresDeUnTema, TemaDeUnTono } from '../../../entities/diseno/tonos'

const ETIQUETA: Record<TemaDeUnTono, string> = { claro: 'Claro', oscuro: 'Oscuro' }

type Props = { tema: TemaDeUnTono; colores: ColoresDeUnTema }

// Cómo se ve un tono en un tema: un «Aa» con su fondo, su borde y su tinta. El color es un dato del tono (no un token de la interfaz), así que va en `style`, y el tema
// que se dibuja es el del tono, no el de quien mira.
export function MuestraDeTono({ tema, colores }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft)">
      <span
        aria-hidden
        className="inline-flex h-8 min-w-12 items-center justify-center rounded-md border-2 font-semibold"
        style={{
          backgroundColor: colores.fondo,
          borderColor: colores.borde,
          color: colores.tinta,
        }}
      >
        Aa
      </span>
      {ETIQUETA[tema]}
    </span>
  )
}
