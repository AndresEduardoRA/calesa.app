## 2026-11-11 — Paso 5.02-1: la base del módulo `flujos`

- **D1 · La versión del flujo es `flujos.actualizado_en`**, un texto ISO tal como lo trae la base, nunca un `Date`: ya existe, así que no hace falta migración (el 5.01 sólo
  suma `_flujo_para_editar()`, que la bloquea).
- **D2 · Sólo la lista de fases**, sin «camino» dibujado ni «historial»: las salidas serán chips por fila (5.06) y el historial de cambios es `actividad` (Fase 9).
- **D3 · El flujo se elige por la URL:** `?origen=<id>` y `?ambito=repuestos` (como Configuración › Cotización; sirve al enlace de Orígenes).
- **D4 · 4-48 y 4-102 se cierran aquí,** un commit cada uno: el paso ya toca `src/shared` (Nivel 2).
- **D5 · El 5.02 se parte en dos sesiones** (5.02-1 la base del módulo, 5.02-2 la pantalla): serían 8 commits de código y el tope es 6. Los dos van en la rama `a/5.02`; el PR
  del 5.02-1 **no** marca integrado el paso.
- **D6 · En `src/app/(app)/configuracion/flujos/` sólo habrá carpetas para `fases`, `requisitos`, `documentos` y `reglas`** (las áreas que llenan algo en `app`, según
  `docs/plan.yaml`); `transiciones`, `revisar` y `mover` entran por los huecos del módulo y no tienen carpeta.
- **D7 · Cada área suma sus pestañas** con `PESTANAS_DE_<ÁREA>: readonly PestanaDeFlujos[] = []` en su `pestanas.ts`; con una sola pestaña («Fases») la barra no se dibuja y
  una pestaña no existe hasta que su paso la llena (nunca un botón muerto).
- **D8 · `conDestino()` de Orígenes recibe el id del origen** para que el paso «Flujo» enlace con `?origen=<id>` (5.02-2; cambia `pasos.test.ts` y `[id]/page.tsx`).
- **Del módulo:** `features/configuracion/` es del núcleo; la guarda no deja carpetas nuevas sin dueño (o es de un área o la suma el A al núcleo). `leerRolesParaElegir()` expone
  id, nombre y color (ya los lee cualquier cuenta con sesión) y no trae permisos; `flujos` no importa `equipo`: `src/app` lo pasará al inspector.
- **Topes** (`entities/flujo.ts`): fases 200, transiciones y requisitos 500, roles de flujo 500, reglas 50, flujos 100, cada uno leído con `tope + 1`; sin `RENDIMIENTO.md` ni
  volumen sembrado (configuración, decenas de filas).
