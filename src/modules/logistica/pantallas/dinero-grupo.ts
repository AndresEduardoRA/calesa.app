// Los huecos del resumen de un grupo del área `dinero` de `logistica` (6.01, llenado en 6.11-4): «Prorratear un gasto entre las unidades». Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import type { HuecoDelGrupo } from '../entities/nucleo/grupo'
import { HuecoDeProrrateoDiferido } from '../features/dinero/components/diferidos'

export const HUECOS_DE_DINERO_EN_EL_GRUPO: readonly HuecoDelGrupo[] = [
  {
    clave: 'gastos',
    titulo: 'Prorratear un gasto entre las unidades',
    // Los costos no se anuncian: sin la clave el bloque no se dibuja. La base la pide por cada unidad.
    permisos: ['logistica.gastos.editar'],
    regla: 'gastos',
    componente: HuecoDeProrrateoDiferido,
  },
]
