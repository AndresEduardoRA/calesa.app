## 2026-11-12 · Paso 8.01-1: la base de `web` por RPC (parte 1 de 4 del 8.01)

- **Hecho:**
  - **El documento del sitio.** `_web_doc_html(jsonb)` valida un documento de ProseMirror contra una lista blanca (párrafo, títulos 2 y 3, listas, cita,
    negrita, cursiva, enlace http/https/mailto/tel con `rel`, salto, imagen del bucket `web`; 100 KB) y devuelve su HTML escapado; `_web_doc_minutos`.
    Espejo `entities/contenido/doc.ts` con `doc.casos.ts`, que corre contra los dos.
  - **Guías.** `web_guias.cuerpo_doc`; `trg_web_guia_cuerpo` deriva `cuerpo_html` y `minutos_lectura` (lo escrito a mano se pisa; publicar recalcula).
    `storage_refcount` cuenta las imágenes del cuerpo.
  - **Ajustes.** `web_ajustes_guardar(versión, cambios)` con permisos por grupo, `PT409` y validación por clave; `legales` con su HTML derivado por
    trigger; fuera la policy «ajustes_web: editar» y el `UPDATE` de `authenticated`.
  - **Testimonios.** `web_testimonio_consentir` y `web_testimonio_retirar`; `consent_*` fuera de la escritura directa; el trigger del trío, que además anula
    el consentimiento si cambia lo que dice.
  - Decisiones en `decisiones.md` (D1–D17). La auditoría del plan dejó observaciones (13) y se atendieron en el plan; la del informe, observaciones
    (8): un `fix` amplía la prueba de privilegios y apaga los permisos de ciudad y vehículo al cambiarlos; lo menor que queda está en D17.
- **Commits:** `9f031745` (documento en la base), `bb800600` (espejo TS), `28c97303` (guías), `e7fd8e5f` (ajustes), `534409af` (testimonios), el `fix`
  de la auditoría del informe y el de docs.
- **Falta (8.01-2 a 8.01-4):**
  - 8.01-2: el esqueleto por áreas de `src/modules/web/` (`sitio`, `contenido`, `cola`, `turnos`, `portal`).
  - 8.01-3: `/configuracion/web` con `RUTAS`, `seccion.ts`, `pestanas.ts` y los huecos nulos.
  - 8.01-4: la pestaña «Ajustes» y `e2e/configuracion-web-ajustes.spec.ts`; cierra «`ajustes_web.direccion_publica` no tiene pantalla».
- **Abiertos de `docs/PLAN.md` que cierra:** las contradicciones 2 (la política de la cola) y 4 («Tiptap saneado») de la Fase 8.
- **Contrato con el repo del sitio:** `web.ajustes.legales` cambia de forma (D2) y `web.guias.cuerpo_html` trae imágenes como `<img data-ruta>` (D4).
- **Verificación** (`.piloto/salidas/8.01-1/`):
  - `db:probar` completo tras el último commit de SQL: 1.238 ✓, ningún ✗ (`probar-final.txt`).
  - `doc.test.ts`: 98 ✓, los casos contra TS y contra la base (`doc-test.txt`). `scripts/guardas`: 1.094 ✓ (`guardas.txt`).
  - `db:lint`: sin errores (`db-lint.txt`). `nivel.mjs`: Nivel 2 por `rls` y `estructura` (`nivel.txt`).
- e2e completo: no (8.01-1, Nivel 2 por rls y estructura: lo corre el CI del PR; dirigidos: vehiculos-vitrina, leads-portal, leads-portal-acceso)
