# Estado

> Cómo está el producto hoy. **60 líneas como máximo.** No es un registro: se edita sólo cuando cambia el estado (algo nuevo funcionando,
> un verde que dejó de serlo). Qué existe en el código lo dice `docs/MAPA.md`; lo que falta, `docs/PENDIENTES.md`; cómo se trabaja,
> `docs/FLUJO.md`. Las versiones anteriores: `git log -p docs/ESTADO.md`.

**Última actualización:** 2026-11-13
**Estado:** **terminado (fases 0 a 9) y listo para desplegar.** Desplegar es de la persona (`docs/DESPLIEGUE.md`). Desde aquí el proyecto
recibe actualizaciones sueltas: una rama, un PR que se integra solo con el CI en verde.

## Funcionando

- **Equipo y permisos:** registro e invitaciones, roles libres sobre un catálogo fijo de permisos, por origen y con alcance, dominancia
  sobre la persona, bajas con traspaso de cartera, «Ver como».
- **Empresa y orígenes:** ajustes, monedas y tipos de cambio, integraciones (apibara, web pública), campos por origen con rango.
- **Vehículos:** inventario por origen con rutas e índices por caso, ficha con fotos y documentos, vitrina, papelera, subastas por apibara.
- **Leads:** listado y kanban con cartera, teléfono único y enmascarado, campos configurables y privados, seguimientos, oportunidades,
  importar y exportar, limpieza automática, papelera.
- **Cotizaciones:** la fórmula como grafo versionado (motor en TS con su espejo SQL), el diseño de la hoja, niveles de acceso, la hoja de
  cotizar, guardar con revisiones, la tarjeta y el PDF, la final, comprobantes, comentarios y papelera.
- **Flujos y logística:** fases, transiciones, requisitos y reglas por RPC; `/logistica` (la cadena, «qué falta», mover y el lote,
  documentos, embarques, aduana, gastos, pagos y margen).
- **Repuestos:** proyectos, ítems, compras, stock, cotizador propio y pagos.
- **Agenda, chat, notificaciones y buscador:** calendario y tareas, canales y grupos con realtime, la campana y el push (sin claves
  VAPID todavía), la paleta `Ctrl/Cmd+K`.
- **Web y portal:** el contenido de la web pública por el esquema `web`, la cola con rueda y turnos, el portal del cliente por
  `api/portal/*`.
- **Actividad, datos y tablero:** `/actividad` con el diff recortado por cartera y su purga, `/datos` (exportar e importar todo con
  `importar-csv`), `/tablero` con widgets por persona, Inicio con sus bloques, la PWA.
- **Tareas de oro** (KLM, en `escritorio` y `movil`): registrar 18,3 s de 25; cotizar 58,1 s de 90; mover 1 en 11,3 s de 15 y el
  contenedor de 8 en 14,6 de 60; «Contacté» en 1 toque y el portal en 8,5 s de 30.

## Verdes

- `lint`, `typecheck`, `test` (10.300+ pruebas), `db:probar` (1.483 bloques), `db:lint`, `db:carreras` y `mapa.sh --check`.
- **Último e2e completo (Nivel 3, sobre `20815f1c`):** escritorio 1.291 en verde, 17 saltadas, 0 caídas, 54,1 min; celular 898 en
  verde, 31 saltadas, 0 caídas, 38,2 min.
- **CI:** Nivel 1 siempre, «Base» si cambia código, los e2e dirigidos (o el completo de escritorio en 4 bloques si toca un disparador),
  y `Listo · todo en verde`, el único check que `main` exige; el completo de escritorio, cada noche.
- **Base:** una sola migración (`20261113065630_base.sql`, las 249 anteriores aplastadas con la huella de la base idéntica).
- **Despliegue:** el ensayo en seco en `listo` (`pnpm despliegue:en-seco`).

## Al borde

- Presupuestos: la hoja, 491 nodos de 500; JS de `/cotizaciones/nuevo` 439,5 de 460 KB y de `/cotizaciones/[id]` 452,2 de 460; ficha
  del lead «Datos» 39,2 de 43 KB y «Oportunidades» 61,2 de 66. Con la regla del 5 % se sube el tope (`docs/RENDIMIENTO.md`).
- El e2e completo con los dos proyectos tarda ≈ 95 min de reloj (5a-4b): en CI va en 4 bloques.

## Siguiente

- **Para la persona:** producción (variables, secretos, `db push`) y la lista de `docs/DESPLIEGUE.md` › «Lo que sólo una persona
  comprueba»; después, las decisiones de producto de `docs/PENDIENTES.md`.
- **Para una sesión:** lo que la persona pida, o lo de `docs/PENDIENTES.md` › «Seguridad y dinero» primero.
