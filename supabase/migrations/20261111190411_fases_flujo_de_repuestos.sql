-- El flujo de repuestos lo garantiza una migración (paso 5.01-2): un despliegue donde no corre la semilla quedaba sin él y nadie podía crearlo
-- (`flujos` no se escribe directo desde el 5.01-1). Si no hay flujo de repuestos, se crea («Repuestos») con las 7 reglas de siempre, activas y
-- sin fases (las fases son de cada empresa: las siembra `seed.sql` o se crean en «Fases»). Un flujo de repuestos que ya existe no se toca: sus
-- reglas son de la empresa.

with nuevo as (
  insert into public.flujos (ambito, nombre)
  select 'repuestos', 'Repuestos'
  where not exists (select 1 from public.flujos where ambito = 'repuestos')
  returning id
)
insert into public.flujos_reglas (flujo_id, regla, activa)
select nuevo.id, r, true
from nuevo, unnest(array['logistica', 'alerta_demora', 'transporte', 'contenedor', 'gastos', 'pagos', 'esperas']) r;
