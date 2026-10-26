import { cssDeTonos, type Tono } from './tonos'

type Props = {
  // Las filas de `tonos` de la empresa, ya leídas por quien dibuja la hoja: `shared` no las busca.
  tonos: readonly Tono[]
}

// Los colores de los tonos sobre las celdas, en runtime, claro y oscuro. Va una vez por hoja (sin 'use client', como `<EstiloDeMarca>`).
export function EstiloDeTonos({ tonos }: Props) {
  const css = cssDeTonos(tonos)
  return css === '' ? null : <style>{css}</style>
}
