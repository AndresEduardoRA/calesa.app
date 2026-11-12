## 2026-11-12 — Paso 7.13-3: la paleta `Ctrl/Cmd+K` (parte 3 de 3, cierra el 7.13)

- **Hecho:**
  - `RUTAS` suma `cotizaciones`, `nuevaCotizacion`, `nuevoVehiculo` y `PANEL_NUEVO_DE_VEHICULOS`; `claves.ts` de vehículos y `ruta-de-la-hoja.ts` de cotizaciones se derivan de ahí.
  - `buscador`: `entities/ruta-de-resultado.ts` y los componentes de `features/paleta/components/` (`buscador`, `paleta`, `cuerpo-de-la-paleta`, `ultimos-abiertos`,
    `lista-de-resultados`, `fila-de-resultado`, `reintentar`, `diferidos`); `shell.client.ts`. La paleta es un `CommandDialog` sin URL con filtro propio, viaja con `diferido()`
    y se adelanta al llegar el puntero. Estados: buscando, sin resultados, error y sin conexión con «Reintentar», parcial, «No se busca por teléfono».
  - `leads`: `useAbrirNuevoLead()` (en `use-panel-de-alta.ts`, por la guarda de paneles con vuelta) y `shell.client.ts`.
  - `src/app/(app)`: `_shell/acciones-de-la-paleta.ts` (por `puede()`, con test), `HuecoBuscador({ acciones })` que une `buscador`, `leads` y la lista de `?`; el layout lo monta
    y se borra `buscador-pendiente.tsx`.
  - e2e: `buscador.spec.ts` (Ctrl+K y Enter abren la ficha y sale en «Últimos abiertos», el ajeno no aparece; Nueva cotización, Nuevo lead con el foco dentro del panel y Ver todos; sin conexión y Reintentar)
    y `barra-superior-celular.spec.ts` (botón habilitado, paleta dentro de 412 px al 200 %).
- **Commits:** `feat(shared)`, `feat(buscador)` ×2, `feat(app)`, `test(buscador)` y el de docs.
- **Verificación** (`.piloto/salidas/7.13-3/`): vitest de `rutas`, `ruta-de-resultado` y `acciones-de-la-paleta` ✓; `scripts/guardas` 36 archivos, 1.116 ✓ (antes del hueco) y con `_shell` 1.147 ✓; eslint y tsc limpios
  (sin los 8 errores previos de `.next` en logística y repuestos). e2e dirigidos: `buscador` 5 ✓ en escritorio y 5 ✓ en celular; `barra-superior-celular` ✓ en los dos; `barra-de-filtros-200`, `barra-de-filtros-vehiculos-200`,
  `cotizar-tarea-de-oro-recorrido`, `leads-alta-casos` ✓; `presupuesto-js` ✓ tras subir el tope del documento de `/perfil`.
- **Presupuesto:** el documento de `/perfil` pasó de 93.382 B a **100.444 B** (+7,1 KB, las ≈ 30 acciones de la dueña como props en cada pantalla): tope 96 → 103 KB (lo medido más un 5 %, `e2e/soporte/presupuestos.ts`, `docs/RENDIMIENTO.md`).
  El JS en frío de ninguna ruta pasó su presupuesto. Si pesara, la salida es quitar las «Configuración: …» (D7).
- e2e completo: no (7.13-3, Nivel 2: lo prueba el CI del PR; dirigidos: buscador, barra-superior-celular, barra-de-filtros-200, barra-de-filtros-vehiculos-200, cotizar-tarea-de-oro-recorrido, presupuesto-js, leads-alta-casos)
- **Para el carril A:**
  - En `docs/PLAN.md`, fila 7.13: «**7.13 hecha (3 de 3)** (la paleta `Ctrl/Cmd+K`, «Últimos abiertos», acciones por `puede()`, `?`; `docs/pasos/7.13-3/`)». Cierra «el atajo `?` sin lista» (`docs/PLAN.md:1562`) y «la paleta» y «la lista de `?`» de `docs/PLAN.md:1551`.
  - 7.11 y 7.13 ya no comparten hueco: `<BuscadorPendiente>` no existe (`docs/PLAN.md:1595`).
