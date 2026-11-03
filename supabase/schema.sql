-- KingCoin: esquema do banco para o Supabase.
-- Cole este arquivo inteiro em Supabase > SQL Editor > New query e execute (Run).
-- É seguro rodar mais de uma vez: quem já tinha a versão anterior só precisa
-- executá-lo de novo para receber as tabelas e funções novas.

-- ---------------------------------------------------------------------------
-- Tipos e tabelas
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.tipo_movimentacao as enum ('RECEITA', 'DESPESA', 'ECONOMIA');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text,
  sobrenome   text,
  telefone    text,
  foto_url    text,
  criado_em   timestamptz not null default now()
);

alter table public.profiles add column if not exists sobrenome text;

-- Categorias: user_id nulo = categoria padrão do app; preenchido = personalizada do usuário.
create table if not exists public.categorias (
  id       serial primary key,
  nome     text not null,
  tipo     public.tipo_movimentacao not null,
  user_id  uuid references auth.users (id) on delete cascade
);

alter table public.categorias
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.categorias drop constraint if exists categorias_nome_tipo_key;
create unique index if not exists categorias_unicas_idx
  on public.categorias (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), nome, tipo);

create table if not exists public.movimentacoes (
  id               bigint generated always as identity primary key,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria_id     integer not null references public.categorias (id),
  data             date not null,
  valor            numeric(10, 2) not null check (valor > 0),
  descricao        text,
  criado_em        timestamptz not null default now()
);

alter table public.movimentacoes
  add column if not exists comprovante_path text;

create index if not exists movimentacoes_user_data_idx
  on public.movimentacoes (user_id, data desc);

create table if not exists public.metas (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome         text not null default 'Nova Meta',
  valor_meta   numeric(10, 2) not null check (valor_meta > 0),
  valor_atual  numeric(10, 2) not null default 0 check (valor_atual >= 0),
  criado_em    timestamptz not null default now()
);

create index if not exists metas_user_idx on public.metas (user_id);

-- Orçamento mensal por categoria de despesa.
create table if not exists public.orcamentos (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria_id  integer not null references public.categorias (id) on delete cascade,
  valor_limite  numeric(10, 2) not null check (valor_limite > 0),
  criado_em     timestamptz not null default now(),
  unique (user_id, categoria_id)
);

-- Transações que se repetem todo mês (salário, aluguel, assinaturas...).
create table if not exists public.recorrencias (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria_id       integer not null references public.categorias (id),
  valor              numeric(10, 2) not null check (valor > 0),
  descricao          text,
  dia_do_mes         smallint not null check (dia_do_mes between 1 and 31),
  inicio             date not null default current_date,
  ativa              boolean not null default true,
  ultimo_mes_gerado  date,
  criado_em          timestamptz not null default now()
);

-- Contas bancárias foram removidas do app: limpa o que versões anteriores criaram.
alter table public.movimentacoes drop column if exists conta_id;
alter table public.recorrencias drop column if exists conta_id;
drop table if exists public.contas;

-- ---------------------------------------------------------------------------
-- Categorias padrão (as mesmas do KingCoin web)
-- ---------------------------------------------------------------------------

insert into public.categorias (nome, tipo)
select v.nome, v.tipo::public.tipo_movimentacao
from (values
  ('Salário',            'RECEITA'),
  ('Freelance',          'RECEITA'),
  ('Outros Rendimentos', 'RECEITA'),
  ('Aluguel',            'DESPESA'),
  ('Moradia',            'DESPESA'),
  ('Supermercado',       'DESPESA'),
  ('Alimentação',        'DESPESA'),
  ('Restaurante',        'DESPESA'),
  ('Transporte',         'DESPESA'),
  ('Saúde',              'DESPESA'),
  ('Educação',           'DESPESA'),
  ('Lazer',              'DESPESA'),
  ('Outros gastos',      'DESPESA'),
  ('Poupança',           'ECONOMIA'),
  ('Investimentos',      'ECONOMIA')
) as v (nome, tipo)
where not exists (
  select 1
  from public.categorias c
  where c.user_id is null
    and c.nome = v.nome
    and c.tipo = v.tipo::public.tipo_movimentacao
);

-- ---------------------------------------------------------------------------
-- Perfil criado automaticamente quando o usuário se cadastra
-- (aceita o nome vindo do cadastro por e-mail, do Google e da Apple)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, sobrenome)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'nome',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'sobrenome'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Funções chamadas pelo app
-- ---------------------------------------------------------------------------

-- Lança as transações recorrentes que já venceram (uma por mês, sem repetir).
-- p_hoje vem do aparelho para respeitar o fuso horário do usuário.
create or replace function public.gerar_recorrencias(p_hoje date)
returns integer
language plpgsql
set search_path = public
as $$
declare
  r record;
  mes date;
  ultimo_dia integer;
  dia_efetivo date;
  total integer := 0;
begin
  for r in
    select * from public.recorrencias
    where user_id = auth.uid() and ativa
  loop
    if r.ultimo_mes_gerado is null then
      mes := date_trunc('month', r.inicio)::date;
    else
      mes := (r.ultimo_mes_gerado + interval '1 month')::date;
    end if;

    while mes <= date_trunc('month', p_hoje)::date loop
      ultimo_dia := extract(day from (mes + interval '1 month' - interval '1 day'))::integer;
      dia_efetivo := mes + (least(r.dia_do_mes, ultimo_dia) - 1);

      exit when dia_efetivo > p_hoje;

      if dia_efetivo >= r.inicio then
        insert into public.movimentacoes (user_id, categoria_id, data, valor, descricao)
        values (r.user_id, r.categoria_id, dia_efetivo, r.valor, r.descricao);
        total := total + 1;
      end if;

      update public.recorrencias set ultimo_mes_gerado = mes where id = r.id;
      mes := (mes + interval '1 month')::date;
    end loop;
  end loop;

  return total;
end;
$$;

-- Apaga a conta do usuário logado e, por cascata, todos os dados dele.
create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
grant execute on function public.gerar_recorrencias(date) to authenticated;

-- ---------------------------------------------------------------------------
-- Segurança (Row Level Security): cada usuário só enxerga os próprios dados
-- ---------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.categorias     enable row level security;
alter table public.movimentacoes  enable row level security;
alter table public.metas          enable row level security;
alter table public.orcamentos     enable row level security;
alter table public.recorrencias   enable row level security;

drop policy if exists "profiles: ler o próprio"        on public.profiles;
drop policy if exists "profiles: criar o próprio"      on public.profiles;
drop policy if exists "profiles: atualizar o próprio"  on public.profiles;
create policy "profiles: ler o próprio"
  on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles: criar o próprio"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles: atualizar o próprio"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Categorias: todos veem as padrão; cada um cria, edita e apaga só as próprias.
drop policy if exists "categorias: leitura para logados" on public.categorias;
drop policy if exists "categorias: leitura"              on public.categorias;
drop policy if exists "categorias: criar próprias"       on public.categorias;
drop policy if exists "categorias: editar próprias"      on public.categorias;
drop policy if exists "categorias: apagar próprias"      on public.categorias;
create policy "categorias: leitura"
  on public.categorias for select to authenticated
  using (user_id is null or user_id = auth.uid());
create policy "categorias: criar próprias"
  on public.categorias for insert to authenticated
  with check (user_id = auth.uid());
create policy "categorias: editar próprias"
  on public.categorias for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categorias: apagar próprias"
  on public.categorias for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "movimentacoes: acesso do dono" on public.movimentacoes;
create policy "movimentacoes: acesso do dono"
  on public.movimentacoes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "metas: acesso do dono" on public.metas;
create policy "metas: acesso do dono"
  on public.metas for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "orcamentos: acesso do dono" on public.orcamentos;
create policy "orcamentos: acesso do dono"
  on public.orcamentos for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "recorrencias: acesso do dono" on public.recorrencias;
create policy "recorrencias: acesso do dono"
  on public.recorrencias for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage
--   avatars:      fotos de perfil (público; cada usuário escreve só na própria pasta)
--   comprovantes: fotos de comprovantes (privado; só o dono lê e escreve)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

drop policy if exists "avatars: leitura pública"         on storage.objects;
drop policy if exists "avatars: enviar na própria pasta" on storage.objects;
drop policy if exists "avatars: trocar na própria pasta" on storage.objects;
drop policy if exists "avatars: apagar na própria pasta" on storage.objects;

create policy "avatars: leitura pública"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: enviar na própria pasta"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: trocar na própria pasta"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: apagar na própria pasta"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "comprovantes: ler os próprios"    on storage.objects;
drop policy if exists "comprovantes: enviar na pasta"    on storage.objects;
drop policy if exists "comprovantes: trocar na pasta"    on storage.objects;
drop policy if exists "comprovantes: apagar na pasta"    on storage.objects;

create policy "comprovantes: ler os próprios"
  on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "comprovantes: enviar na pasta"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "comprovantes: trocar na pasta"
  on storage.objects for update to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "comprovantes: apagar na pasta"
  on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Faz a API do Supabase enxergar na hora as tabelas e colunas novas.
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';
