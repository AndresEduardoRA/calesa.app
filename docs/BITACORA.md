# Bitácora

Append-only. Una línea por sesión. Lo más reciente al final.

Formato: `AAAA-MM-DD — qué se hizo — qué sigue`

---

2026-10-11 — semilla del proyecto generada con schema verificado (100 tablas, 10 pruebas de humo), UX, plan de 10 fases y fichas de 17 módulos; sin código de app todavía — faltaban fichas, design/ y verificación final
2026-10-11 — semilla completada: fichas de los 17 módulos escritas, tokens y marca neutra, íconos PWA, README, contrato de edge functions, boundaries migrado a sintaxis v7 y probado, schema re-verificado (27 archivos, 10 pruebas), mapa limpio — correr setup.sh y ejecutar la fase 0
2026-10-11 — fase 0: semilla saneada (ESLint 10 con max-params corregido, typegen antes de tsc, commitlint, loader de Tailwind, shadcn a src/shared/ui), barandillas de lint y mapa probadas, migración base generada desde schemas, Supabase local en 546xx con tipos, src/shared/lib con 35 tests, tema con tokens y oscuro, manifest y sw — fase 1 en sesión nueva: equipo, empresa y shell (con «ver como»)
2026-10-11 — fase 0 cerrada: llegaron .claude/ y .github/, los tres hooks probados en vivo (lint-archivo.sh corregido para devolver el detalle por stderr), CI con puertos 546xx y verificación de la migración base, src/shared alineado a las reglas (actionClient con ctx.permisos, createClient, { ok, data }, conflicto()), primer commit — fase 1: equipo, empresa y shell, con «ver como»
2026-10-11 — fase 1, parte 1 de 3 (acceso y shell): registro, ingreso con contraseña y Google, recuperación, `/auth/callback` con `code` y `token_hash`, proxy con `returnTo`, shell `(app)` por permisos con densidad, tema, Modo Live y View Transitions, bandeja vacía por permiso, perfil propio, componentes compartidos (estados, esqueletos, Monto, Drawer, Modal, Bloque, Confirmar, toasts, atajos), migración de acceso (`web.ajustes_acceso`, `mi_sesion`), plantillas de correo y primer e2e — sigue la parte 2: equipo, roles, invitaciones y «ver como»
2026-10-11 — fase 1, parte 2 de 3 (equipo y roles): invitar por correo con un rol (cuenta por la API de admin, enlace único), lista del equipo con estado, roles por persona, bloqueo y baja con conteo del limbo, matriz de roles × permisos por origen y alcance con dominancia visible y conflictos `PT409`, perspectiva «ver como» con permisos efectivos en SQL, `client.ts` como entrada de cliente, guardián reescrito, registro de invitados corregido (trigger diferido), voz en tuteo, 17 pruebas de humo y e2e de equipo en escritorio y móvil — sigue la parte 3: empresa (ajustes, monedas, tipos de cambio, integraciones, íconos)
