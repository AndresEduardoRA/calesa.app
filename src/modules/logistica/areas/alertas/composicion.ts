// Composición de el área `alertas` de `logistica` en el servidor (6.12-2): la lectura de la bandeja de Inicio. Sale por la `composicion.ts` de la raíz.
import 'server-only'
import { leerBandejaDeLaBase } from '../../infra/alertas/bandeja'

/** Demoradas, trabados y por aprobar que ve quien mira, `tope` filas por lista; una sola lectura por request. */
export const bandejaLogistica = leerBandejaDeLaBase
