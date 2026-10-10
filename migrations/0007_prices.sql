insert into app_settings (key, value)
values ('anonymous_fee', '9.9')
on conflict (key) do nothing;
