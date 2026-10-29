import { z } from 'zod'

import type { Resultado } from '../errores'

// El contrato de un correo que manda la app, el mismo para todo proveedor. Las plantillas viven en el repo (en código) y llegan
// aquí ya como `html` y `texto`: nada se guarda en el panel de un proveedor, ni se usan sus audiencias, broadcasts o plantillas.
export const esquemaDeMensaje = z.object({
  para: z.union([z.email(), z.array(z.email()).min(1).max(50)]),
  asunto: z.string().trim().min(1).max(200),
  html: z.string().min(1),
  texto: z.string().trim().min(1),
  // Para buscar o agrupar en el proveedor (`tipo: invitacion`): claves y valores cortos, sin datos de personas.
  etiquetas: z
    .record(z.string().regex(/^[a-z0-9_-]{1,40}$/), z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/))
    .optional(),
})

export type MensajeDeEmail = z.infer<typeof esquemaDeMensaje>
export type Remitente = { email: string; nombre: string }
export type EnvioDeEmail = { id: string }

// Un adaptador por proveedor, por su API REST: recibe el mensaje ya validado y el remitente de la configuración.
export type AdaptadorDeEmail = (
  mensaje: MensajeDeEmail,
  remitente: Remitente,
) => Promise<Resultado<EnvioDeEmail>>

export const destinatarios = (para: MensajeDeEmail['para']): string[] =>
  Array.isArray(para) ? [...para] : [para]
