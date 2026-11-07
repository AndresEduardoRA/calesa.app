// Las marcas de 1Password, LastPass, Bitwarden y Dashlane para que un campo de contraseña no invite a «Guardar contraseña». Copia de las de la entrada de la XCell
// (`src/shared/ui/xcell/entrada-de-xcell.tsx:24`, `MARCAS_DE_GESTORES`, que no se exportan): con el Modo Live, «Valor nuevo» del ⚙ (una constante o un tipo de cambio)
// se escribe como una celda. Un solo lugar del área (4.20-3d).
export const MARCAS_DE_GESTORES = {
  'data-1p-ignore': 'true',
  'data-lpignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
}
