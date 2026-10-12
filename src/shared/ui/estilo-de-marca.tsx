import { cssDeMarca, esHex, tokensDeMarca } from '@/shared/lib/color'

type Props = {
  // `ajustes_empresa.color_acento`. Sin color, o con uno que no da contraste (guardado antes de
  // que existiera la regla), quedan los valores neutros de design/tokens.css.
  color: string | null
}

// El color de la empresa sobre los tokens, en runtime. Lo emite el layout que ya leyó los
// ajustes: `shared` no los busca.
export function EstiloDeMarca({ color }: Props) {
  if (!color || !esHex(color)) {
    return null
  }
  const marca = tokensDeMarca(color)
  return marca.ok ? <style>{cssDeMarca(marca.tokens)}</style> : null
}
