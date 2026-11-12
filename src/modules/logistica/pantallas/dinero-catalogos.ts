// Los catálogos de `/configuracion/logistica` del área `dinero` de `logistica` (6.01, llenado en 6.11-4): «Categorías de gasto». Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { CatalogoDeLogistica } from '../entities/nucleo/enlaces'
import { CategoriasDeGastoDiferido } from '../features/dinero/components/diferidos-del-catalogo'

export const CATALOGOS_DE_DINERO: readonly CatalogoDeLogistica[] = [
  {
    clave: 'categorias-de-gasto',
    titulo: 'Categorías de gasto',
    permiso: 'logistica.catalogos.gestionar',
    componente: CategoriasDeGastoDiferido,
  },
]
