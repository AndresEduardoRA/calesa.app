-- La vigencia de una cotización (D1, paso 4.15-2): `vigencia_dias` de la empresa, 7 por defecto. Una cotización vale desde el día de su `creado_en`
-- (en la zona de la empresa) hasta ese día + `vigencia_dias`, entero; pasado, está vencida (docs/GLOSARIO.md › «Vigencia», «Vencida»). La lee quien
-- lee `ajustes_empresa`; nadie la escribe todavía (`empresa_actualizar` no la nombra): la configura el 4.20.

alter table public.ajustes_empresa
  add column vigencia_dias integer not null default 7
  constraint ajustes_empresa_vigencia_dias_check check (vigencia_dias between 1 and 365);

comment on column public.ajustes_empresa.vigencia_dias is 'Días desde el día de creado_en (en zona_horaria) en que una cotización vale; pasados, está vencida (D1). La configura el 4.20.';
