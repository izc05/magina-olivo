import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getPool } from './db.ts';

export type LoyaltySummary = {
  pendingBalance: number;
  availableBalance: number;
  lifetimeEarned: number;
  level: {
    code: string;
    name: string;
    minLifetimeEarned: number;
  } | null;
  nextLevel: {
    code: string;
    name: string;
    minLifetimeEarned: number;
    olivesRemaining: number;
  } | null;
};

export type AwardLoyaltyEventInput = {
  userId: string;
  eventType: string;
  idempotencyKey: string;
  sourceType?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
};

type BalanceRow = {
  pending_balance: string;
  available_balance: string;
  lifetime_earned: string;
};

type LevelRow = {
  code: string;
  name: string;
  min_lifetime_earned: string;
};

type RuleRow = {
  id: string;
  olives: string;
  per_user_lifetime_limit: number | null;
  cooldown_seconds: number | null;
};

type ExistingEventRow = {
  status: 'accepted' | 'rejected' | 'reversed';
  olives: string | null;
};

async function ensureWallet(client: PoolClient, userId: string): Promise<void> {
  await client.query(
    `insert into loyalty_wallets (user_id)
     values ($1)
     on conflict (user_id) do nothing`,
    [userId],
  );
}

async function lockWallet(client: PoolClient, userId: string): Promise<void> {
  await ensureWallet(client, userId);
  await client.query('select user_id from loyalty_wallets where user_id = $1 for update', [userId]);
}

async function readSummary(client: PoolClient, userId: string): Promise<LoyaltySummary> {
  await ensureWallet(client, userId);

  const balance = (
    await client.query<BalanceRow>(
      `select pending_balance, available_balance, lifetime_earned
       from loyalty_wallet_balances
       where user_id = $1`,
      [userId],
    )
  ).rows[0];

  const pendingBalance = Number(balance?.pending_balance ?? '0');
  const availableBalance = Number(balance?.available_balance ?? '0');
  const lifetimeEarned = Number(balance?.lifetime_earned ?? '0');

  const level = (
    await client.query<LevelRow>(
      `select code, name, min_lifetime_earned
       from loyalty_levels
       where active = true and min_lifetime_earned <= $1
       order by min_lifetime_earned desc
       limit 1`,
      [lifetimeEarned],
    )
  ).rows[0] ?? null;

  const nextLevel = (
    await client.query<LevelRow>(
      `select code, name, min_lifetime_earned
       from loyalty_levels
       where active = true and min_lifetime_earned > $1
       order by min_lifetime_earned asc
       limit 1`,
      [lifetimeEarned],
    )
  ).rows[0] ?? null;

  return {
    pendingBalance,
    availableBalance,
    lifetimeEarned,
    level: level
      ? {
          code: level.code,
          name: level.name,
          minLifetimeEarned: Number(level.min_lifetime_earned),
        }
      : null,
    nextLevel: nextLevel
      ? {
          code: nextLevel.code,
          name: nextLevel.name,
          minLifetimeEarned: Number(nextLevel.min_lifetime_earned),
          olivesRemaining: Math.max(0, Number(nextLevel.min_lifetime_earned) - lifetimeEarned),
        }
      : null,
  };
}

export async function getLoyaltySummary(userId: string): Promise<LoyaltySummary> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const summary = await readSummary(client, userId);
    await client.query('commit');
    return summary;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function awardLoyaltyEvent(input: AwardLoyaltyEventInput): Promise<{
  awarded: boolean;
  duplicate: boolean;
  olives: number;
  reason: 'awarded' | 'duplicate' | 'no_active_rule' | 'lifetime_limit' | 'cooldown';
  summary: LoyaltySummary;
}> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await lockWallet(client, input.userId);

    const existing = (
      await client.query<ExistingEventRow>(
        `select e.status, r.olives
         from loyalty_reward_events e
         left join loyalty_rules r on r.id = e.rule_id
         where e.user_id = $1 and e.idempotency_key = $2
         limit 1`,
        [input.userId, input.idempotencyKey],
      )
    ).rows[0];

    if (existing) {
      const summary = await readSummary(client, input.userId);
      await client.query('commit');
      return {
        awarded: existing.status === 'accepted',
        duplicate: true,
        olives: Number(existing.olives ?? '0'),
        reason: 'duplicate',
        summary,
      };
    }

    const rule = (
      await client.query<RuleRow>(
        `select id, olives, per_user_lifetime_limit, cooldown_seconds
         from loyalty_rules
         where event_type = $1
           and active = true
           and (starts_at is null or starts_at <= now())
           and (ends_at is null or ends_at >= now())
         order by created_at desc, id desc
         limit 1`,
        [input.eventType],
      )
    ).rows[0];

    if (!rule) {
      const summary = await readSummary(client, input.userId);
      await client.query('commit');
      return {
        awarded: false,
        duplicate: false,
        olives: 0,
        reason: 'no_active_rule',
        summary,
      };
    }

    let rejectionReason: 'lifetime_limit' | 'cooldown' | null = null;

    if (rule.per_user_lifetime_limit != null) {
      const count = (
        await client.query<{ count: string }>(
          `select count(*)::text as count
           from loyalty_reward_events
           where user_id = $1 and rule_id = $2 and status = 'accepted'`,
          [input.userId, rule.id],
        )
      ).rows[0];
      if (Number(count?.count ?? '0') >= rule.per_user_lifetime_limit) {
        rejectionReason = 'lifetime_limit';
      }
    }

    if (!rejectionReason && rule.cooldown_seconds != null && rule.cooldown_seconds > 0) {
      const coolingDown = (
        await client.query<{ cooling_down: boolean }>(
          `select exists (
             select 1
             from loyalty_reward_events
             where user_id = $1
               and rule_id = $2
               and status = 'accepted'
               and occurred_at > now() - ($3 * interval '1 second')
           ) as cooling_down`,
          [input.userId, rule.id, rule.cooldown_seconds],
        )
      ).rows[0]?.cooling_down ?? false;
      if (coolingDown) rejectionReason = 'cooldown';
    }

    const eventId = randomUUID();
    const metadata = {
      ...(input.metadata ?? {}),
      ...(rejectionReason ? { rejectionReason } : {}),
    };

    await client.query(
      `insert into loyalty_reward_events (
         id, user_id, rule_id, event_type, source_type, source_id,
         idempotency_key, status, metadata
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [
        eventId,
        input.userId,
        rule.id,
        input.eventType,
        input.sourceType ?? null,
        input.sourceId ?? null,
        input.idempotencyKey,
        rejectionReason ? 'rejected' : 'accepted',
        JSON.stringify(metadata),
      ],
    );

    if (rejectionReason) {
      const summary = await readSummary(client, input.userId);
      await client.query('commit');
      return {
        awarded: false,
        duplicate: false,
        olives: 0,
        reason: rejectionReason,
        summary,
      };
    }

    const olives = Number(rule.olives);
    await client.query(
      `insert into loyalty_transactions (
         id, user_id, reward_event_id, kind,
         pending_delta, available_delta, lifetime_earned_delta,
         reference_type, reference_id, reason
       )
       values ($1, $2, $3, 'earn', $4, 0, $4, $5, $6, $7)`,
      [
        randomUUID(),
        input.userId,
        eventId,
        olives,
        input.sourceType ?? null,
        input.sourceId ?? null,
        input.eventType,
      ],
    );

    const summary = await readSummary(client, input.userId);
    await client.query('commit');
    return {
      awarded: true,
      duplicate: false,
      olives,
      reason: 'awarded',
      summary,
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function collectPendingOlives(userId: string, idempotencyKey: string): Promise<{
  collected: number;
  duplicate: boolean;
  summary: LoyaltySummary;
}> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await lockWallet(client, userId);

    const existing = (
      await client.query<{ available_delta: string }>(
        `select available_delta
         from loyalty_transactions
         where user_id = $1
           and kind = 'collect'
           and reference_type = 'collection_request'
           and reference_id = $2
         limit 1`,
        [userId, idempotencyKey],
      )
    ).rows[0];

    if (existing) {
      const summary = await readSummary(client, userId);
      await client.query('commit');
      return {
        collected: Number(existing.available_delta),
        duplicate: true,
        summary,
      };
    }

    const before = await readSummary(client, userId);
    if (before.pendingBalance <= 0) {
      await client.query('commit');
      return { collected: 0, duplicate: false, summary: before };
    }

    const collected = before.pendingBalance;
    await client.query(
      `insert into loyalty_transactions (
         id, user_id, kind, pending_delta, available_delta,
         lifetime_earned_delta, reference_type, reference_id, reason
       )
       values ($1, $2, 'collect', $3, $4, 0, 'collection_request', $5, 'tu_olivo')`,
      [randomUUID(), userId, -collected, collected, idempotencyKey],
    );

    const summary = await readSummary(client, userId);
    await client.query('commit');
    return { collected, duplicate: false, summary };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
