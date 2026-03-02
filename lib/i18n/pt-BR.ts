export const ptBR = {
  appName: 'Finanças',
  nav: {
    dashboard: 'Painel',
    transactions: 'Transações',
    accounts: 'Contas',
    categories: 'Categorias',
    goals: 'Metas',
    logout: 'Sair'
  },
  actions: {
    newTransaction: 'Nova transação',
    save: 'Salvar',
    delete: 'Excluir',
    add: 'Adicionar',
    clear: 'Limpar filtros',
    cancel: 'Cancelar'
  },
  labels: {
    description: 'Descrição',
    amount: 'Valor',
    date: 'Data',
    type: 'Tipo',
    account: 'Conta',
    accountName: 'Nome da conta',
    category: 'Categoria',
    month: 'Mês',
    goalMonth: 'Mês da meta',
    monthlyLimit: 'Limite mensal',
    name: 'Nome',
    paymentMethod: 'Forma de pagamento',
    allCategories: 'Todas as categorias',
    allTypes: 'Todos os tipos'
  },
  paymentMethod: {
    credit: 'Crédito',
    debit: 'Débito',
    pix: 'Pix',
    cash: 'Dinheiro'
  },
  typeLabel: {
    income: 'Receita',
    expense: 'Despesa'
  },
  dashboard: {
    title: 'Visão mensal',
    subtitle: 'Acompanhe suas entradas, saídas e metas do mês selecionado.',
    totalIncome: 'Receitas',
    totalExpenses: 'Despesas',
    currentBalance: 'Saldo atual',
    byCategory: 'Despesas por categoria',
    byCategoryHint: 'Distribuição das despesas no mês selecionado.',
    goalsMonth: 'Metas do mês',
    goalsHint: 'Limites planejados por categoria.',
    recentTransactions: 'Transações recentes'
  },
  states: {
    noTransactions: 'Nenhuma transação cadastrada ainda.',
    noCategories: 'Nenhuma categoria cadastrada ainda.',
    noGoals: 'Nenhuma meta cadastrada ainda.',
    noAccounts: 'Nenhuma conta cadastrada ainda.',
    noGoalsMonth: 'Nenhuma meta cadastrada para este mês.',
    noChartData: 'Sem despesas para exibir no gráfico.'
  },
  auth: {
    login: 'Entrar',
    signup: 'Criar conta',
    email: 'E-mail',
    password: 'Senha',
    noAccount: 'Não tem conta?',
    hasAccount: 'Já possui conta?',
    createOne: 'Criar agora',
    signIn: 'Fazer login'
  },
  pages: {
    transactionsTitle: 'Transações',
    categoriesTitle: 'Categorias',
    goalsTitle: 'Metas',
    accountsTitle: 'Contas'
  },
  hints: {
    quickAdd: 'Preencha os campos para registrar rapidamente.',
    filters: 'Use os filtros para organizar sua visualização.'
  },
  modal: {
    title: 'Nova transação rápida',
    validation: 'Preencha valor, data, conta e categoria para continuar.'
  },
  dialog: {
    confirmDeleteTitle: 'Confirmar exclusão',
    confirmDeleteDescription: 'Tem certeza que deseja excluir? Esta ação não pode ser desfeita.'
  }
} as const;
