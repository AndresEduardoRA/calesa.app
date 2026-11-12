## 2026-11-12 · Paso 8.02-1: preguntas frecuentes de Configuración › Sitio web (parte 1 de 2)

### Hecho

- La pestaña «Preguntas frecuentes» (`/configuracion/web?seccion=faqs`, `web.contenido.gestionar`): lista con `<ListaDeCatalogo>` (insignia Publicada / Sin publicar, categoría, orden con «Subir» y «Bajar»), alta y edición en `<Drawer>` con URL (`?panel=nueva-faq`, `?panel=faq&faq=<id>`), «Publicar»/«Despublicar» desde el «⋯» y eliminar con `<Confirmar>` con URL (`?panel=eliminar-faq`). Escritura directa bajo la RLS con la versión esperada (D3).
- Capas en `web/contenido`: `entities/contenido/{faqs,errores,repositorios,paneles}.ts` (+ `faqs.test.ts`: `reordenar`, categorías, validación), `infra/contenido/faqs.ts`, `areas/contenido/{index,composicion}.ts`, `features/contenido/faqs/`, `pantallas/sitio-faqs.ts` y `seccion-faqs.tsx` de `src/app`. Guardas registradas: `confirmar-con-url.ts` y `drawers-con-salida.ts` de `scripts/guardas/areas-b/`.
- `supabase/tests/areas/web/faqs-permisos.sql` (sin migración): sin el permiso no se crea, edita ni borra; con él sí y la versión vieja no escribe; `anon` sólo lee lo publicado por `web.faqs`.
- Verificado: `faqs.test.ts` 12 de 12; guardas y módulo `web` en verde (1.117 en `scripts/guardas`); `SOLO=areas/web/faqs-permisos.sql pnpm db:probar` 3 de 3; e2e `configuracion-web-faqs.spec.ts` y `configuracion-web-ajustes.spec.ts` en escritorio (`.piloto/salidas/8.02/`); lint y typecheck limpios.
- Falta la **8.02-2** (testimonios con consentimiento); su plan está servido en `.piloto/planes/8.02.md` › «Parte servida».

e2e completo: no (8.02-1, Nivel 1: lo corre el CI del PR; dirigidos en verde)
