import type { FastifyInstance } from 'fastify';
import { requirePlatformAdmin } from './admin-access.ts';
import { getPool } from './db.ts';

type CommandCenterRow = {
  users_with_holding: number;
  active_holdings: number;
  active_plots: number;
  open_campaigns: number;
  pending_applications: number;
  active_sponsorships: number;
  sponsorships_expiring_14d: number;
  open_support_tickets: number;
  urgent_support_tickets: number;
  active_announcements: number;
  scheduled_announcements: number;
  active_rain_alerts: number;
  featured_news: number;
  sources_with_errors: number;
  sources_review_due: number;
  missing_active_legal_documents: number;
  draft_legal_documents: number;
  system_evidence_pending: number;
  system_evidence_failed: number;
  audit_events_24h: number;
};

export function registerAdminCommandCenterRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/command-center', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;

    const result = await getPool().query<CommandCenterRow>(`
      select
        (select count(distinct user_id)::int from holding_members where status = 'active') as users_with_holding,
        (select count(*)::int from holdings where active = true) as active_holdings,
        (select count(*)::int from plots where active = true) as active_plots,
        (select count(*)::int from campaigns where status in ('planned', 'active')) as open_campaigns,
        (select count(*)::int from advertiser_applications where status = 'pending') as pending_applications,
        (
          select count(*)::int
          from sponsorships
          where status = 'active'
            and (starts_at is null or starts_at <= now())
            and (ends_at is null or ends_at > now())
        ) as active_sponsorships,
        (
          select count(*)::int
          from sponsorships
          where status = 'active'
            and ends_at > now()
            and ends_at <= now() + interval '14 days'
        ) as sponsorships_expiring_14d,
        (
          select count(*)::int
          from support_tickets
          where status in ('new', 'in_progress', 'waiting_user')
        ) as open_support_tickets,
        (
          select count(*)::int
          from support_tickets
          where status in ('new', 'in_progress', 'waiting_user')
            and priority = 'urgent'
        ) as urgent_support_tickets,
        (
          select count(*)::int
          from platform_announcements
          where status = 'active'
            and (starts_at is null or starts_at <= now())
            and (ends_at is null or ends_at > now())
        ) as active_announcements,
        (
          select count(*)::int
          from platform_announcements
          where status = 'scheduled'
            and (starts_at is null or starts_at > now())
        ) as scheduled_announcements,
        (
          select count(*)::int
          from weather_alert_events
          where status = 'active'
            and forecast_date >= current_date
        ) as active_rain_alerts,
        (
          select count(*)::int
          from public_news_items
          where active = true and featured = true
        ) as featured_news,
        (
          select count(*)::int
          from public_data_sources
          where active = true and last_error is not null
        ) as sources_with_errors,
        (
          select count(*)::int
          from public_data_sources
          where active = true
            and last_error is null
            and (last_checked_at is null or last_checked_at < now() - interval '7 days')
        ) as sources_review_due,
        (
          3 - count(distinct document_key) filter (where status = 'active')
        )::int as missing_active_legal_documents,
        (
          select count(*)::int
          from legal_documents
          where status = 'draft'
        ) as draft_legal_documents,
        (
          select count(*)::int
          from system_operational_evidence
          where status <> 'ok'
        ) as system_evidence_pending,
        (
          select count(*)::int
          from system_operational_evidence
          where status = 'failed'
        ) as system_evidence_failed,
        (
          select count(*)::int
          from platform_admin_audit_log
          where occurred_at >= now() - interval '24 hours'
        ) as audit_events_24h
      from legal_documents
    `);

    const row = result.rows[0] ?? {
      users_with_holding: 0,
      active_holdings: 0,
      active_plots: 0,
      open_campaigns: 0,
      pending_applications: 0,
      active_sponsorships: 0,
      sponsorships_expiring_14d: 0,
      open_support_tickets: 0,
      urgent_support_tickets: 0,
      active_announcements: 0,
      scheduled_announcements: 0,
      active_rain_alerts: 0,
      featured_news: 0,
      sources_with_errors: 0,
      sources_review_due: 0,
      missing_active_legal_documents: 3,
      draft_legal_documents: 0,
      system_evidence_pending: 4,
      system_evidence_failed: 0,
      audit_events_24h: 0,
    };

    const attentionCount =
      row.pending_applications
      + row.sponsorships_expiring_14d
      + row.open_support_tickets
      + row.sources_with_errors
      + row.sources_review_due
      + row.missing_active_legal_documents
      + row.system_evidence_pending;

    reply.header('cache-control', 'private, no-store');
    return {
      administrator: { email: session.user.email },
      snapshotAt: new Date().toISOString(),
      attentionCount,
      agriculture: {
        usersWithHolding: row.users_with_holding,
        activeHoldings: row.active_holdings,
        activePlots: row.active_plots,
        openCampaigns: row.open_campaigns,
      },
      commercial: {
        pendingApplications: row.pending_applications,
        activeSponsorships: row.active_sponsorships,
        expiring14Days: row.sponsorships_expiring_14d,
      },
      support: {
        openTickets: row.open_support_tickets,
        urgentTickets: row.urgent_support_tickets,
      },
      content: {
        activeAnnouncements: row.active_announcements,
        scheduledAnnouncements: row.scheduled_announcements,
        activeRainAlerts: row.active_rain_alerts,
        featuredNews: row.featured_news,
      },
      sources: {
        withErrors: row.sources_with_errors,
        reviewDue: row.sources_review_due,
      },
      legal: {
        missingActiveDocuments: Math.max(0, row.missing_active_legal_documents),
        draftDocuments: row.draft_legal_documents,
      },
      system: {
        evidencePending: row.system_evidence_pending,
        evidenceFailed: row.system_evidence_failed,
      },
      audit: {
        eventsLast24Hours: row.audit_events_24h,
      },
    };
  });
}
