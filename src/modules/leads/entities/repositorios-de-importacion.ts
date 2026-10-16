// La importación de leads (parte 8): lo que `features/importar` pide y `composicion.ts` le da. Importar
// es la clase de `crear_lead` (`leads.crear`): quien importa queda de dueña de lo que crea.
import type { Resultado } from '@/shared/lib/errores'
import type { ImportacionReciente, ResultadoDeDeshacer } from './importacion/deshacer'
import type { PedidoDeFila } from './importacion/filas'
import type { ResultadoDeFila } from './importacion/lotes'

export type RepositorioDeImportacion = {
  // Un lote de hasta 50 filas. Cada fila vale por sí misma y es idempotente por su id: reenviar el lote
  // tras perder la respuesta devuelve lo ya creado como `repetido`.
  importarLote: (pedido: {
    importacionId: string
    // Cuántas filas válidas tiene la importación entera (para su constancia).
    total: number
    filas: readonly PedidoDeFila[]
  }) => Promise<Resultado<ResultadoDeFila[]>>
  // Cierra la importación, deja la constancia (sólo números) y guarda el origen del archivo como último
  // origen. Idempotente.
  terminar: (pedido: {
    importacionId: string
    yaExistian: number
    rechazadas: number
    origenId: string | null
  }) => Promise<Resultado<{ creadas: number }>>
  // Deshace una importación propia dentro de 24 h: manda a la papelera lo que sigue intacto y cuenta, por
  // motivo y con la fila del archivo, lo que se queda. Idempotente. No pide permisos: sólo haberla hecho.
  deshacer: (importacionId: string) => Promise<Resultado<ResultadoDeDeshacer>>
  // Las importaciones propias de las últimas 24 h, con números y nada del archivo.
  recientes: () => Promise<Resultado<ImportacionReciente[]>>
}
