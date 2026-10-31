-- Taxa de "Escolher dia e hora" passa a R$ 9,90.
insert into app_settings (key, value) values ('schedule_fee', '9.9')
on conflict (key) do update set value = excluded.value;
