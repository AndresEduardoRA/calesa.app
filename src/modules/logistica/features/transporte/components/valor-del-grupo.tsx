// Lo que dice una columna de un grupo ya escrito (`textosDelGrupo`): el texto, o «—» si ninguna unidad lo tiene (D30).
export function ValorDelGrupo({ texto }: { texto: string | null }) {
  return texto === null ? <span className="text-(--color-ink-faint)">—</span> : <>{texto}</>
}
