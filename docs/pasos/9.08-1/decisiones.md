## 2026-11-12 · Decisiones del paso 9.08-1 (`/tablero`: las cinco cifras)

- **D1 · Inicio sigue siendo la bandeja;** sólo gana «Ver el tablero» para quien tiene `tablero.metricas.ver`.
- **D2 · Los widgets se muestran por permiso,** no por rol: cada uno declara los suyos en el catálogo y la RPC los exige otra vez (42501).
- **D3 · Las gráficas serán SVG propio con `--viz-*`** (parte 2), sin dependencia nueva.
- **D4 · Una llamada por grupo de RPC y request:** `cache()` con `(desde, hasta)`; cada widget captura su error y uno caído no tumba a los demás.
- **D5 · El período vive en la URL** (`?periodo=mes|mes-anterior|90d`; ausente o desconocido es `mes`) y el selector son tres `<Link>`: sin JS.
- **D6 · «Mes» = del día 1 a hoy; «mes anterior» = el mes entero; «90d» = hoy − 89 a hoy,** todo en la zona de la empresa (ventana ≤ 366 días).
- **D7 · Una tasa nula es «Sin datos», nunca «0 %»;** una tasa de cero con leads sí es un dato. Cada cifra es un `role="group"` con nombre «Título: valor».
- **D8 · «Convertidos» dice «Cuenta desde <fecha>»** cuando `conversion_desde` cae después del inicio del período (9.07: los clientes de antes no tienen fecha).
- **D9 · «Leads creados» en cero dice «Todavía no hay leads en este período»** y ofrece «Nuevo lead» sólo con `leads.crear`.
- **D10 · Margen y cola web entran al catálogo como huecos** (`disponible: false`): no se montan ni se ofrecen; el 9.11 cambia el indicador y llena su archivo.
- **D11 · La preferencia `tablero.widgets` la valida `equipo`** y viaja en la `Sesion` (parte 3).
- **D12 · El encendido del menú va en el commit de la pantalla,** no en el siguiente como decía el plan: con la ruta creada y la entrada apagada, `navegacion.test.ts` falla.
- **D13 · El e2e compara el aumento de «Convertidos»** (n a n + 1), no un valor fijo: otros specs también convierten leads en el mismo mes.
- **D14 · Tipo de esta parte: pantalla** sobre las RPC de 9.07, sin SQL. Riesgo: el texto de la tasa nula y quién ve la entrada.
