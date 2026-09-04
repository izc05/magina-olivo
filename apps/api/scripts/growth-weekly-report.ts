import { closeDatabase, getPool } from '../src/db.ts';

type CountRow = { key: string; count: string | number };
type RouteCountRow = { route: string; count: string | number };
type ShareRow = { event: string; channel: string; count: string | number };
type BoundsRow = {
  start_date: string;
  end_date: string;
  activation_cohort_start: string;
  activation_cohort_end: string;
};
type ProductRow = {
  registrations: string | number;
  newly_activated: string | number;
  registered_cohort_activated: string | number;
  activation_cohort_registrations: string | number;
  activation_cohort_within_7d: string | number;
  total_registered: string | number;
  total_activated: string | number;
};

type GrowthWeeklyReport = {
  generatedAt: string;
  period: {
    start: string;
    endExclusive: string;
    timezone: 'Europe/Madrid';
  };
  public: {
    totalPageViews: number;
    pageViewsByRoute: Array<{ route: string; count: number }>;
    pageViewsByReferrer: Array<{ referrer: string; count: number }>;
    shareAcquiredPageViews: number;
    shares: Array<{ event: string; channel: string; count: number }>;
  };
  product: {
    registrations: number;
    newlyActivatedUsers: number;
    registeredCohortActivated: number;
    registrationToActivationRate: number | null;
    activationWithin7Days: {
      cohortStart: string;
      cohortEndExclusive: string;
      registrations: number;
      activatedWithin7Days: number;
      rate: number | null;
    };
    totalRegisteredUsers: number;
    totalActivatedUsers: number;
  };
  retention: {
    d7: null;
    d30: null;
    status: 'pending_activity_heartbeat';
    reason: string;
  };
  privacy: {
    joinsAnonymousGrowthToUsers: false;
    visitorLevelHistory: false;
    outputContainsUserIds: false;
  };
};

function asNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

async function assertRequiredSchema(): Promise<void> {
  const result = await getPool().query<{ table_name: string; column_name: string }>(
    `
      select table_name, column_name
      from information_schema.columns
      where table_schema = current_schema()
        and (
          (table_name = 'user' and column_name in ('id', 'createdAt'))
          or (table_name = 'public_growth_daily' and column_name in ('bucket_date', 'event', 'route', 'event_count'))
        )
    `,
  );

  const present = new Set(result.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const required = [
    'user.id',
    'user.createdAt',
    'public_growth_daily.bucket_date',
    'public_growth_daily.event',
    'public_growth_daily.route',
    'public_growth_daily.event_count',
  ];

  const missing = required.filter((key) => !present.has(key));
  if (missing.length > 0) {
    throw new Error(`Growth weekly report schema mismatch: missing ${missing.join(', ')}`);
  }
}

async function buildReport(): Promise<GrowthWeeklyReport> {
  await assertRequiredSchema();
  const db = getPool();

  const boundsResult = await db.query<BoundsRow>(
    `
      select
        ((now() at time zone 'Europe/Madrid')::date - 6)::text as start_date,
        ((now() at time zone 'Europe/Madrid')::date + 1)::text as end_date,
        ((now() at time zone 'Europe/Madrid')::date - 13)::text as activation_cohort_start,
        ((now() at time zone 'Europe/Madrid')::date - 6)::text as activation_cohort_end
    `,
  );
  const bounds = boundsResult.rows[0];
  if (!bounds) throw new Error('Unable to resolve Growth weekly report bounds');

  const [routeResult, referrerResult, shareResult, shareAcquisitionResult, productResult] = await Promise.all([
    db.query<RouteCountRow>(
      `
        select route, sum(event_count)::bigint as count
        from public_growth_daily
        where bucket_date >= $1::date
          and bucket_date < $2::date
          and event = 'public_page_view'
        group by route
        order by count desc, route asc
      `,
      [bounds.start_date, bounds.end_date],
    ),
    db.query<CountRow>(
      `
        select referrer_category as key, sum(event_count)::bigint as count
        from public_growth_daily
        where bucket_date >= $1::date
          and bucket_date < $2::date
          and event = 'public_page_view'
        group by referrer_category
        order by count desc, referrer_category asc
      `,
      [bounds.start_date, bounds.end_date],
    ),
    db.query<ShareRow>(
      `
        select event, channel, sum(event_count)::bigint as count
        from public_growth_daily
        where bucket_date >= $1::date
          and bucket_date < $2::date
          and event in ('share_started', 'share_completed')
        group by event, channel
        order by event asc, count desc, channel asc
      `,
      [bounds.start_date, bounds.end_date],
    ),
    db.query<{ count: string | number }>(
      `
        select coalesce(sum(event_count), 0)::bigint as count
        from public_growth_daily
        where bucket_date >= $1::date
          and bucket_date < $2::date
          and event = 'public_page_view'
          and utm_medium = 'share'
      `,
      [bounds.start_date, bounds.end_date],
    ),
    db.query<ProductRow>(
      `
        with
        first_farm as (
          select holding_id, min(created_at) as created_at
          from farms
          where active = true
          group by holding_id
        ),
        first_plot as (
          select holding_id, min(created_at) as created_at
          from plots
          where active = true
          group by holding_id
        ),
        first_campaign as (
          select holding_id, min(created_at) as created_at
          from campaigns
          where status <> 'archived'
          group by holding_id
        ),
        holding_activation as (
          select
            hm.user_id,
            greatest(
              hm.created_at,
              h.created_at,
              ff.created_at,
              fp.created_at,
              fc.created_at
            ) as activation_at
          from holding_members hm
          join holdings h on h.id = hm.holding_id and h.active = true
          join first_farm ff on ff.holding_id = hm.holding_id
          join first_plot fp on fp.holding_id = hm.holding_id
          join first_campaign fc on fc.holding_id = hm.holding_id
          where hm.status = 'active'
        ),
        user_activation as (
          select user_id, min(activation_at) as activation_at
          from holding_activation
          group by user_id
        ),
        report_registrations as (
          select id, "createdAt" as registered_at
          from "user"
          where "createdAt" >= $1::date
            and "createdAt" < $2::date
        ),
        mature_activation_cohort as (
          select id, "createdAt" as registered_at
          from "user"
          where "createdAt" >= $3::date
            and "createdAt" < $4::date
        )
        select
          (select count(*) from report_registrations)::bigint as registrations,
          (
            select count(*)
            from user_activation
            where activation_at >= $1::date
              and activation_at < $2::date
          )::bigint as newly_activated,
          (
            select count(*)
            from report_registrations rr
            join user_activation ua on ua.user_id = rr.id
            where ua.activation_at < $2::date
          )::bigint as registered_cohort_activated,
          (select count(*) from mature_activation_cohort)::bigint as activation_cohort_registrations,
          (
            select count(*)
            from mature_activation_cohort mc
            join user_activation ua on ua.user_id = mc.id
            where ua.activation_at < mc.registered_at + interval '7 days'
          )::bigint as activation_cohort_within_7d,
          (select count(*) from "user" where "createdAt" < $2::date)::bigint as total_registered,
          (select count(*) from user_activation where activation_at < $2::date)::bigint as total_activated
      `,
      [
        bounds.start_date,
        bounds.end_date,
        bounds.activation_cohort_start,
        bounds.activation_cohort_end,
      ],
    ),
  ]);

  const product = productResult.rows[0];
  if (!product) throw new Error('Unable to calculate Growth product metrics');

  const pageViewsByRoute = routeResult.rows.map((row) => ({ route: row.route, count: asNumber(row.count) }));
  const registrations = asNumber(product.registrations);
  const registeredCohortActivated = asNumber(product.registered_cohort_activated);
  const activationCohortRegistrations = asNumber(product.activation_cohort_registrations);
  const activationCohortWithin7d = asNumber(product.activation_cohort_within_7d);

  return {
    generatedAt: new Date().toISOString(),
    period: {
      start: bounds.start_date,
      endExclusive: bounds.end_date,
      timezone: 'Europe/Madrid',
    },
    public: {
      totalPageViews: pageViewsByRoute.reduce((sum, row) => sum + row.count, 0),
      pageViewsByRoute,
      pageViewsByReferrer: referrerResult.rows.map((row) => ({
        referrer: row.key,
        count: asNumber(row.count),
      })),
      shareAcquiredPageViews: asNumber(shareAcquisitionResult.rows[0]?.count),
      shares: shareResult.rows.map((row) => ({
        event: row.event,
        channel: row.channel,
        count: asNumber(row.count),
      })),
    },
    product: {
      registrations,
      newlyActivatedUsers: asNumber(product.newly_activated),
      registeredCohortActivated,
      registrationToActivationRate: ratio(registeredCohortActivated, registrations),
      activationWithin7Days: {
        cohortStart: bounds.activation_cohort_start,
        cohortEndExclusive: bounds.activation_cohort_end,
        registrations: activationCohortRegistrations,
        activatedWithin7Days: activationCohortWithin7d,
        rate: ratio(activationCohortWithin7d, activationCohortRegistrations),
      },
      totalRegisteredUsers: asNumber(product.total_registered),
      totalActivatedUsers: asNumber(product.total_activated),
    },
    retention: {
      d7: null,
      d30: null,
      status: 'pending_activity_heartbeat',
      reason:
        'Better Auth sessions are not a reliable visit history; D7/D30 remain disabled until an authenticated activity signal is defined.',
    },
    privacy: {
      joinsAnonymousGrowthToUsers: false,
      visitorLevelHistory: false,
      outputContainsUserIds: false,
    },
  };
}

function formatPercent(value: number | null): string {
  return value === null ? 'n/d' : `${value.toFixed(2)} %`;
}

function formatMarkdown(report: GrowthWeeklyReport): string {
  const lines: string[] = [
    '# Mágina Olivo · Growth semanal',
    '',
    `Periodo: ${report.period.start} → ${report.period.endExclusive} (fin exclusivo, ${report.period.timezone})`,
    '',
    '## Descubrimiento público',
    '',
    `- Visitas públicas: ${report.public.totalPageViews}`,
    `- Visitas procedentes de enlaces compartidos: ${report.public.shareAcquiredPageViews}`,
    '',
    '| Página | Visitas |',
    '| --- | ---: |',
    ...report.public.pageViewsByRoute.map((row) => `| ${row.route} | ${row.count} |`),
    '',
    '| Origen aproximado | Visitas |',
    '| --- | ---: |',
    ...report.public.pageViewsByReferrer.map((row) => `| ${row.referrer} | ${row.count} |`),
    '',
    '## Compartidos',
    '',
    '| Evento | Canal | Total |',
    '| --- | --- | ---: |',
    ...report.public.shares.map((row) => `| ${row.event} | ${row.channel} | ${row.count} |`),
    '',
    '## Producto',
    '',
    `- Registros en el periodo: ${report.product.registrations}`,
    `- Nuevos usuarios activados en el periodo: ${report.product.newlyActivatedUsers}`,
    `- Usuarios del periodo ya activados: ${report.product.registeredCohortActivated}`,
    `- Conversión registro → activación: ${formatPercent(report.product.registrationToActivationRate)}`,
    `- Activación ≤7 días (cohorte madura): ${report.product.activationWithin7Days.activatedWithin7Days}/${report.product.activationWithin7Days.registrations} (${formatPercent(report.product.activationWithin7Days.rate)})`,
    `- Base total registrada: ${report.product.totalRegisteredUsers}`,
    `- Base total activada: ${report.product.totalActivatedUsers}`,
    '',
    '## Retención',
    '',
    '- D7: n/d',
    '- D30: n/d',
    `- Estado: ${report.retention.status}`,
    `- Motivo: ${report.retention.reason}`,
    '',
    '> Privacidad: el informe no enlaza eventos públicos anónimos con usuarios, no contiene identificadores y no crea historial de visitantes.',
  ];

  return lines.join('\n');
}

try {
  const report = await buildReport();
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatMarkdown(report)}\n`);
  }
} finally {
  await closeDatabase();
}
