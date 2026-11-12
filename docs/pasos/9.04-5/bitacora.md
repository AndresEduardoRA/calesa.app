## Paso 9.04 · Configuración de leads que quedó, parte 5 y última (2026-11-12)

**Parte 5 (9.04-5): las plantillas por empresa en pantalla.** Esta parte suma dos pestañas en Configuración › Leads, las dos con `leads.configurar`:

- **«Plantilla del embudo»** (`?seccion=embudo`): el editor de etapas del panel del embudo (`ListaDeEtapas`, ahora con el tipo `EtapasEnEdicion`), «Guardar» apagado sin cambios, conflicto con «Recargar» y «Restablecer» que confirma en `?panel=restablecer-embudo`.
- **«Mensaje del portal»** (`?seccion=portal`): el texto para WhatsApp parte del de fábrica con sus variables. Tiene vista previa con datos de ejemplo, el rechazo junto al campo, «Guardar» apagado sin cambios y «Restablecer» que confirma en `?panel=restablecer-portal`.

`textoParaWhatsApp()` aplica `ajustes_leads.portal_mensaje` con `aplicarMensaje()` (una sola pasada); si es nulo, va el de fábrica de siempre. `validarMensajeDelPortal()` es espejo de `_portal_mensaje_normalizar`. La sección «Portal» de la ficha lee `leerAjustesDeLeads()` junto con el acceso. Todo vive en `features/plantillas/`, `entities/ajustes-de-leads.ts` e `infra/ajustes-de-leads.ts`. No hay migración.

Pruebas:

- `entities/portal-mensaje.test.ts`: el espejo de la SQL (orden, textos, code points, `btrim`, `{co\ndigo}`), aplicar en una pasada y el de fábrica con variables, que da el mismo texto.
- `entities/ajustes-de-leads.test.ts`: el contrato de `ajustes_leads_leer()`, con las de fábrica sin marcas.
- `pestanas.test.ts`: 6 pestañas y sus permisos.
- `e2e/configuracion-leads-plantillas.spec.ts`: la dueña cambia el mensaje y Pía, al dar acceso, ve el texto nuevo; la plantilla del embudo se guarda y se restablece.

- **9.04 queda completo** (`parcial: false`). Para que el coordinador los cierre en PLAN y ESTADO: cierra **9-2** (el rango de un campo numérico), **9-3** (`leads.campos.gestionar`), los arrastrados «plantilla de etapas de embudos por empresa» y «plantilla del texto del portal por empresa», y el de ESTADO «Portal: su texto por empresa».
- e2e completo: no (9.04-5, Nivel 2: lo prueba el CI del PR; dirigidos: configuracion-leads-plantillas, configuracion-leads, configuracion-200, leads-portal, leads-portal-acceso, leads-embudo)
- Al retomar (unión con main, 2026-11-12): se resolvió el choque de la ficha de `leads` (las dos intenciones) y se regeneraron los tipos de la base (`db:probar` 1.335 ✓). El completo del CI cayó en `configuracion-leads-seguimientos` porque esperaba cuatro pestañas: ahora espera las seis (6/6 ✓ en escritorio, `.piloto/salidas/9.04/e2e-seguimientos.log`).
