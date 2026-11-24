import {
  PrismaClient,
  UserRole,
  TicketType,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  AffectedScope,
} from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

const USERS = [
  { email: "ana.souza@nexo.com.br", name: "Ana Souza", role: UserRole.employee, department: "Financeiro" },
  { email: "carla.mendes@nexo.com.br", name: "Carla Mendes", role: UserRole.employee, department: "Comercial" },
  { email: "bruno.tavares@nexo.com.br", name: "Bruno Tavares", role: UserRole.employee, department: "Operações" },
  { email: "diego.ramos@nexo.com.br", name: "Diego Ramos", role: UserRole.employee, department: "RH" },
  { email: "elisa.prado@nexo.com.br", name: "Elisa Prado", role: UserRole.employee, department: "Jurídico" },
  { email: "fabio.nunes@nexo.com.br", name: "Fábio Nunes", role: UserRole.employee, department: "TI campo" },
  { email: "gabriela.rocha@nexo.com.br", name: "Gabriela Rocha", role: UserRole.employee, department: "Marketing" },
  { email: "rafael.lima@nexo.com.br", name: "Rafael Lima", role: UserRole.analyst, department: "TI — Suporte N2" },
  { email: "mariana.costa@nexo.com.br", name: "Mariana Costa", role: UserRole.analyst, department: "TI — Suporte N1" },
] as const;

const KB_ARTICLES = [
  {
    slug: "vpn-erro-809",
    title: "VPN com erro 809",
    body: "Reinstale o cliente VPN pelo portal corporativo. Código 809 no Windows 10: siga o passo a passo. Windows 11 pode exigir abrir chamado de rede.",
  },
  {
    slug: "horario-service-desk",
    title: "Horário do service desk",
    body: "Atendimento seg–sex 8h–18h. Chamados críticos têm plantão 24h.",
  },
  {
    slug: "reset-senha-rede",
    title: "Esqueci minha senha da rede",
    body: "Use o portal de autoatendimento. Após 3 tentativas incorretas a conta é bloqueada.",
  },
  {
    slug: "sharepoint-acesso-pasta",
    title: "Solicitar acesso a pasta SharePoint",
    body: "Abra uma requisição de Acesso informando pasta e gestor aprovador.",
  },
  {
    slug: "notebook-lento-pos-update",
    title: "Lentidão após atualização Windows",
    body: "Execute limpeza de disco e atualize drivers. Se persistir, abra INC de Hardware.",
  },
  {
    slug: "segundo-monitor-req",
    title: "Solicitar segundo monitor",
    body: "Abra REQ de Hardware com aprovação do gestor para home office.",
  },
  {
    slug: "sap-senha-bloqueada",
    title: "Senha SAP bloqueada",
    body: "Tente auto-desbloqueio no portal SAP. Se falhar, abra chamado de Acesso.",
  },
  {
    slug: "outlook-mobile-sync",
    title: "Outlook não sincroniza no celular",
    body: "Reconfigure a conta no app. Para contas corporativas restritas, abra chamado.",
  },
] as const;

async function main() {
  const userByEmail = new Map<string, string>();

  for (const u of USERS) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, department: u.department, role: u.role },
      create: u,
    });
    userByEmail.set(u.email, row.id);
  }

  const anaId = userByEmail.get("ana.souza@nexo.com.br")!;
  const diegoId = userByEmail.get("diego.ramos@nexo.com.br")!;
  const fabioId = userByEmail.get("fabio.nunes@nexo.com.br")!;

  const now = new Date();
  const opened20298 = daysAgo(40);
  const tickets = [
    {
      publicId: "INC-20311",
      requesterId: anaId,
      title: "Notebook lento após atualização do Windows",
      description: "Notebook ficou lento depois da atualização do Windows.",
      type: TicketType.INC,
      category: TicketCategory.hardware,
      priority: TicketPriority.medium,
      status: TicketStatus.waiting_analyst,
      affectedScope: AffectedScope.only_me,
      openedAt: daysAgo(12),
      dueAt: daysAgo(5),
      lastUpdatedAt: daysAgo(5),
    },
    {
      publicId: "INC-20298",
      requesterId: anaId,
      title: "Acesso à pasta Financeiro no SharePoint",
      description: "Preciso de acesso à pasta Financeiro.",
      type: TicketType.INC,
      category: TicketCategory.acesso,
      priority: TicketPriority.medium,
      status: TicketStatus.in_progress,
      affectedScope: AffectedScope.team,
      openedAt: opened20298,
      dueAt: daysFromNow(2),
      lastUpdatedAt: daysAgo(3),
    },
    {
      publicId: "REQ-10442",
      requesterId: anaId,
      title: "Segundo monitor para home office",
      description: "Solicito segundo monitor para trabalho remoto.",
      type: TicketType.REQ,
      category: TicketCategory.hardware,
      priority: TicketPriority.low,
      status: TicketStatus.approved,
      affectedScope: AffectedScope.only_me,
      openedAt: daysAgo(45),
      dueAt: daysFromNow(3),
      lastUpdatedAt: daysAgo(10),
    },
    {
      publicId: "INC-20150",
      requesterId: diegoId,
      title: "Senha do SAP bloqueada",
      description: "Senha SAP bloqueada após tentativas.",
      type: TicketType.INC,
      category: TicketCategory.acesso,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      affectedScope: AffectedScope.only_me,
      openedAt: daysAgo(10),
      dueAt: daysAgo(8),
      lastUpdatedAt: daysAgo(4),
      resolvedAt: daysAgo(4),
    },
    {
      publicId: "INC-19877",
      requesterId: anaId,
      title: "Outlook não sincroniza no celular",
      description: "Outlook mobile parou de sincronizar.",
      type: TicketType.INC,
      category: TicketCategory.software,
      priority: TicketPriority.low,
      status: TicketStatus.resolved,
      affectedScope: AffectedScope.only_me,
      openedAt: daysAgo(60),
      dueAt: daysAgo(53),
      lastUpdatedAt: daysAgo(30),
      resolvedAt: daysAgo(30),
    },
    {
      publicId: "INC-19410",
      requesterId: anaId,
      title: "Troca de senha da rede",
      description: "Preciso trocar senha da rede.",
      type: TicketType.INC,
      category: TicketCategory.acesso,
      priority: TicketPriority.low,
      status: TicketStatus.resolved,
      affectedScope: AffectedScope.only_me,
      openedAt: daysAgo(90),
      dueAt: daysAgo(83),
      lastUpdatedAt: daysAgo(70),
      resolvedAt: daysAgo(70),
    },
    {
      publicId: "INC-20517",
      requesterId: fabioId,
      title: "VPN não conecta — erro 809",
      description: "VPN retorna erro 809 no Windows.",
      type: TicketType.INC,
      category: TicketCategory.rede_vpn,
      priority: TicketPriority.high,
      status: TicketStatus.open,
      affectedScope: AffectedScope.only_me,
      openedAt: now,
      dueAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      lastUpdatedAt: now,
    },
  ];

  for (const t of tickets) {
    await prisma.ticket.upsert({
      where: { publicId: t.publicId },
      update: {
        ...t,
        resolvedAt: "resolvedAt" in t ? t.resolvedAt : null,
      },
      create: t,
    });
  }

  for (const article of KB_ARTICLES) {
    await prisma.knowledgeArticle.upsert({
      where: { slug: article.slug },
      update: { title: article.title, body: article.body },
      create: article,
    });
  }

  const existingConv = await prisma.conversation.findFirst({
    where: { userId: anaId, state: "with_agent" },
  });

  if (!existingConv) {
    await prisma.conversation.create({
      data: {
        userId: anaId,
        state: "with_agent",
        sessionSequence: 1,
        messageCount: 0,
      },
    });
  }

}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });