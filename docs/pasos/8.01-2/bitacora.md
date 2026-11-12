## 2026-11-12 · Paso 8.01-2: el esqueleto por áreas de `web` (parte 2 de 4 del 8.01)

- **Hecho:**
  - **Áreas.** `src/modules/web/` se parte en `sitio`, `contenido`, `cola`, `turnos`, `portal` y el `nucleo`, con el modelo de `repuestos` (8.08-2):
    cada área tiene `areas/<área>/{index,client,composicion}.ts`, `pantallas/<área>.ts` (nula) y sus lugares en `features|entities|infra/<área>/`.
    `index.ts`, `composicion.ts` y el `client.ts` nuevo de la raíz sólo hacen `export *`.
  - **Movidos, sin cambiar lo que sale:** la rueda a `entities/turnos/` y `features/turnos/rueda/`; la dirección pública a `entities/sitio/` e
    `infra/sitio/direccion-publica.ts`. `@/modules/web` sigue dando `leerDireccionPublica` y `puedeEstarEnLaRueda`, y `pantallas/perfil.ts`
    sigue dando `EstadoEnLaRueda`: ningún archivo de `src/app/` cambió.
  - **Guarda** `scripts/guardas/areas-b/areas-de-web.test.ts`, copia adaptada de la de `repuestos`, con `PANTALLAS_DE_AREA` (`perfil` → `turnos`,
    `sitio-guias|faqs|testimonios` → `contenido`). Decisiones en `decisiones.md` (D1–D6).
- **Commits:** `dc2e27ed` (mover a las áreas), `32a4ff25` (entradas por área), `18e2e517` (la guarda) y el de docs.
- **Falta (8.01-3 y 8.01-4):**
  - 8.01-3: `/configuracion/web` con `RUTAS`, `seccion.ts`, `pestanas.ts` y los huecos nulos (`pantallas/sitio-<pestaña>.ts`); lo nuevo de servidor
    del sitio va en `areas/sitio/`, nunca en la raíz.
  - 8.01-4: la pestaña «Ajustes» y su e2e; cierra «`ajustes_web.direccion_publica` no tiene pantalla».
- **Verificación** (`.piloto/salidas/8.01-2/`): `areas-de-web.test.ts` 13 ✓ (`guarda-web.txt`); `scripts/guardas` 1.108 ✓ (`guardas.txt`);
  `vitest related` 3 ✓ (`related.txt`); `typecheck` sin errores (`typecheck.txt`); `mapa.sh --check` limpio; e2e dirigidos 36 ✓ en escritorio y móvil (`e2e.txt`).
- e2e completo: no (8.01-2, Nivel 1: lo prueba el CI del PR; dirigidos: rueda-por-rol, leads-portal, leads-portal-acceso, perfil-notificaciones, perfil-avatar)
