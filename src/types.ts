export type Tipo = 'RECEITA' | 'DESPESA' | 'ECONOMIA';

export type PeriodoId = 'este_mes' | 'ultimo_mes' | 'ultimos_3_meses' | 'este_ano';

export type Categoria = {
  id: number;
  nome: string;
  tipo: Tipo;
  /** Nulo nas categorias padrão do app; preenchido nas personalizadas. */
  user_id: string | null;
};

export type Movimentacao = {
  id: number;
  data: string; // AAAA-MM-DD
  valor: number;
  descricao: string | null;
  categoria_id: number;
  comprovante_path: string | null;
  categorias: Categoria;
  /** Criada sem internet e ainda não enviada ao servidor. */
  pendente?: boolean;
};

export type NovaMovimentacao = {
  categoria_id: number;
  data: string;
  valor: number;
  descricao: string | null;
  comprovante_path: string | null;
};

export type Meta = {
  id: number;
  nome: string;
  valor_meta: number;
  valor_atual: number;
  criado_em: string;
};

export type NovaMeta = {
  nome: string;
  valor_meta: number;
  valor_atual: number;
};

export type Perfil = {
  id: string;
  nome: string | null;
  sobrenome: string | null;
  telefone: string | null;
  foto_url: string | null;
};

export type Orcamento = {
  id: number;
  categoria_id: number;
  valor_limite: number;
  categorias: Categoria;
};

export type Recorrencia = {
  id: number;
  categoria_id: number;
  valor: number;
  descricao: string | null;
  dia_do_mes: number;
  inicio: string;
  ativa: boolean;
  categorias: Categoria;
};

export type NovaRecorrencia = {
  categoria_id: number;
  valor: number;
  descricao: string | null;
  dia_do_mes: number;
  ativa: boolean;
  inicio?: string;
};
