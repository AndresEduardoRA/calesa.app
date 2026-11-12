## 2026-11-12 — Paso 9.04-5: las plantillas por empresa en pantalla

- **Las pestañas se llaman como el glosario**, «Plantilla del embudo» y «Mensaje del portal»; van tras «Tipos de seguimiento», en `?seccion=embudo|portal`, y piden `leads.configurar` (duda 2 del PLAN). Las actions repiten el `puede` y la RPC lo exige otra vez.
- **«Restablecer» confirma en la URL** (`?panel=restablecer-embudo`, `?panel=restablecer-portal`, registrados en `scripts/guardas/confirmar-con-url.ts`) y se apaga si ya está lo de fábrica; escrita a mano en ese caso, se avisa y se limpia. El del portal envía `''`, que la base toma como nulo, porque el tipo generado de `p_texto` no admite `null`. El del embudo envía `null`. Un conflicto al restablecer se dice dentro del diálogo, con «Recargar».
- **El editor de la plantilla vive en la página, no en un drawer,** y reusa `ListaDeEtapas` con un tipo más angosto (`EtapasEnEdicion`). Las etapas llevan un id local sólo para la `key` y no viaja: la infra lo quita antes de llamar a la RPC.
- **Sin aviso de cambios sin guardar en la página:** `useCambiosSinGuardar()` sólo pregunta dentro de un `<Drawer>`. «Guardar» se apaga sin cambios, como en las demás pantallas de Configuración.
- **El textarea del portal parte del texto de fábrica con sus variables**, para editar sobre lo de hoy. Guardar ese texto tal cual envía `null`, para que la empresa no fije el de fábrica como propio y un cambio futuro del de fábrica le llegue. En blanco no se guarda: «Para volver al texto de fábrica, usa «Restablecer».», que confirma.
- **La vista previa usa un cliente, un código y una clave de ejemplo fijos** (nunca una clave real), con la empresa y la dirección reales. La compone `src/app`: `leads` no importa `empresa` ni `web`.
- **`{cliente}` de un lead sin nombre queda vacío.** No se reescribe la puntuación de la plantilla; el de fábrica sí saluda «Hola.» sin nombre.
- **La validación del mensaje en TS es espejo de `_portal_mensaje_normalizar`:** el orden, los textos, el largo en code points y el recorte sólo de ` \t\n\r`. Se dice junto al campo antes de enviar; la base decide.
- **Si la ficha no puede leer los ajustes, la sección «Portal» cae al `error.tsx` con «Reintentar»**, como cuando no puede leer el acceso: no se manda un texto que la empresa no eligió.
- **Las variables se reemplazan en una sola pasada:** un nombre con `{clave}` o `$&` sale literal.
- **El e2e deja `ajustes_leads` en lo de fábrica** con service_role, antes y después, porque Playwright corre con un solo worker. `leads-portal` y `leads-embudo` siguen viendo lo de fábrica.
- **Sin e2e en celular, capturas ni volumen** (pruebas sólo en lo clave); `configuracion-200.spec.ts` no suma las dos pestañas, pero corre dirigido por la barra.
