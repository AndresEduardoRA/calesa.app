---
name: feature
description: Implementa un caso de uso completo de importadora respetando la arquitectura por módulos, con tests, ficha de unidad, glosario y mapa al día. Úsala cuando pidan una feature, pantalla o caso de uso nuevo.
argument-hint: '<qué tiene que poder hacer quién>'
---

# /feature $ARGUMENTS

1. **Orientarte sin explorar.** Lee `docs/MAPA.md` y `docs/ESTADO.md`. Si toca pantallas, lee la
   fila de la pantalla y el flujo de la tarea en `docs/UX.md` (patrón, roles, estados obligatorios).
   Busca en `docs/GLOSARIO.md` los términos del pedido, y con grep en `docs/LECCIONES.md` y
   `docs/DECISIONES.md` lo del módulo y del tipo de cambio (una migración, una RPC, un e2e). Recién
   después abre código, y sólo el que el mapa señala. Trabaja en una rama (`docs/FLUJO.md`).
2. **Ubicarla.** Decide en qué módulo vive según `docs/ARQUITECTURA.md`. Si no encaja en ninguno y
   crees que hace falta un módulo nuevo, **para y pregunta**: crear un módulo es una decisión de
   arquitectura, no de implementación.
3. **Permiso primero.** ¿Qué clave de `permisos` protege esto? Si no existe, es una migración que
   crea la clave (su fila en `permisos` con `aplicado_en`) y su enforcement (policy o RPC) antes de
   cualquier UI.
4. **Implementar** de adentro hacia afuera: `entities` (tipos, reglas puras, tests) → `infra`
   (queries, RPC, repositorios) → feature (schema Zod, action con next-safe-action, UI) → ruta en
   `app`. Las fechas cruzan como ISO; los montos pasan por `<Monto>`.
5. **Estados de pantalla.** Toda pantalla nueva resuelve cargando (esqueleto propio), vacío
   primera vez, vacío por filtro, error con reintentar, sin permiso, conflicto `PT409`, y los
   propios de la tarea. Sin eso no está terminada.
6. **Memoria del proyecto.** Unidad nueva → su `CLAUDE.md`; contrato cambiado → ficha actualizada
   (lo que es, sin historia); término nuevo → `docs/GLOSARIO.md`; decisión no obvia →
   `docs/DECISIONES.md`; trampa que costó tiempo → `docs/LECCIONES.md`.
7. **Cerrar** con la skill `entregar`: verifica, deja los docs al día, commitea y publica el PR, que
   se integra solo con el CI en verde. Reporta qué quedó, qué descubriste y qué no hiciste a propósito.
