// Los catálogos de `/configuracion/logistica` del área `transporte` de `logistica` (6.01, llenado en 6.08-1): «Puertos» y «Navieras». Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { CatalogoDeLogistica } from '../entities/nucleo/enlaces'
import {
  NavierasDeTransporteDiferido,
  PuertosDeTransporteDiferido,
} from '../features/transporte/components/diferidos-del-catalogo'

export const CATALOGOS_DE_TRANSPORTE: readonly CatalogoDeLogistica[] = [
  {
    clave: 'puertos',
    titulo: 'Puertos',
    permiso: 'logistica.catalogos.gestionar',
    componente: PuertosDeTransporteDiferido,
  },
  {
    clave: 'navieras',
    titulo: 'Navieras',
    permiso: 'logistica.catalogos.gestionar',
    componente: NavierasDeTransporteDiferido,
  },
]
