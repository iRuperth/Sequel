import type { Row } from "../csv"
import type { WebPool } from "../pools"
import { WeightedPicker, weightedPicker, type Random } from "../random"
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  formatDate,
  formatTimestamp,
  parseIsoDate,
  startOfDay,
  yearOf,
} from "../time"
import { fillTemplate, money, padNumber, slugify, toCents } from "./format"
import { TimeSampler } from "./seasonality"
import { defineTable, type GeneratedTable, type GeneratorContext } from "./types"

type Page = WebPool["pages"][number]
type ExperimentSpec = WebPool["experiments"][number]

const QUARTER_MONTHS = 3
const BOT_MIN_PAGES = 15
const BOT_MAX_PAGES = 40

interface Campaign {
  id: number
  name: string
  channel: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  budgetCents: number
  startsOn: number
  endsOn: number | null
  weight: number
}

interface Visitor {
  index: number
  id: string
  device: WebPool["devices"][number]
  browser: string
  os: string
  country: string
  customerId: number | null
  bot: string | null
}

interface Experiment {
  id: number
  spec: ExperimentSpec
  status: string
  startedAt: number
  endedAt: number | null
  assignments: Map<Visitor, "control" | "treatment" | null>
}

interface PageView {
  path: string
  pageType: string
  referrer: string | null
  viewedAt: number
  timeOnPageMs: number | null
}

interface EventRecord {
  name: string
  pagePath: string | null
  at: number
  properties: string
}

interface Session {
  id: number
  sequence: number
  visitor: Visitor
  campaign: Campaign | null
  trafficSource: string
  referrerDomain: string | null
  startedAt: number
  endedAt: number
  dropped: boolean
  pageViews: PageView[]
  events: EventRecord[]
}

interface Assignment {
  experiment: Experiment
  visitor: Visitor
  variant: string
  assignedAt: number
}

function buildCampaigns(context: GeneratorContext, random: Random): Campaign[] {
  const pool = context.pools.web
  const { startMs, endMs } = context.clock
  const templates = weightedPicker(pool.campaignTemplates.filter((template) => !template.alwaysOn))
  const campaigns: Campaign[] = []
  const usedKeys = new Map<string, number>()
  const add = (
    template: WebPool["campaignTemplates"][number],
    theme: string | null,
    startsOn: number,
    durationDays: number,
  ) => {
    const rawEnd = startsOn + (durationDays - 1) * MS_PER_DAY
    const label =
      theme === null ? `${template.name} ${yearOf(startsOn)}` : `${theme} (${template.name})`
    const baseKey = `${slugify(theme ?? template.name)}_${template.channel}_${formatDate(startsOn).slice(0, 7).replace("-", "")}`
    const seen = (usedKeys.get(baseKey) ?? 0) + 1
    usedKeys.set(baseKey, seen)
    campaigns.push({
      id: 0,
      name: label,
      channel: template.channel,
      utmSource: template.utmSource,
      utmMedium: template.utmMedium,
      utmCampaign: seen > 1 ? `${baseKey}_${seen}` : baseKey,
      budgetCents: toCents(
        Math.round(random.float(template.budgetRange[0], template.budgetRange[1]) / 100) * 100,
      ),
      startsOn,
      endsOn: rawEnd > endMs ? null : rawEnd,
      weight: 0,
    })
  }
  for (const template of pool.campaignTemplates.filter((candidate) => candidate.alwaysOn)) {
    for (let year = yearOf(startMs); year <= yearOf(endMs); year += 1) {
      const startsOn = Math.max(Date.UTC(year, 0, 1), startOfDay(startMs))
      add(template, null, startsOn, Math.round((Date.UTC(year + 1, 0, 1) - startsOn) / MS_PER_DAY))
    }
  }
  for (let quarterStart = startOfDay(startMs); quarterStart <= endMs;) {
    const date = new Date(quarterStart)
    const nextQuarter = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + QUARTER_MONTHS, 1)
    for (let index = 0; index < pool.campaignsPerQuarter; index += 1) {
      const template = templates.pick(random)
      const startsOn = startOfDay(quarterStart + random.next() * (nextQuarter - quarterStart))
      if (startsOn > endMs) {
        continue
      }
      add(
        template,
        random.pick(pool.campaignThemes),
        startsOn,
        random.int(template.durationDays[0], template.durationDays[1]),
      )
    }
    quarterStart = Date.UTC(
      new Date(nextQuarter).getUTCFullYear(),
      new Date(nextQuarter).getUTCMonth(),
      1,
    )
  }
  campaigns.sort(
    (left, right) =>
      left.startsOn - right.startsOn || left.utmCampaign.localeCompare(right.utmCampaign),
  )
  campaigns.forEach((campaign, index) => {
    campaign.id = index + 1
    const days = ((campaign.endsOn ?? endMs) - campaign.startsOn) / MS_PER_DAY + 1
    campaign.weight = campaign.budgetCents / Math.max(1, days)
  })
  return campaigns
}

export function generateWeb(context: GeneratorContext): GeneratedTable[] {
  const pools = context.pools
  const pool = pools.web
  const rates = pool.rates
  const names = pool.eventNames
  const funnel = pool.funnelPaths
  const { startMs, endMs } = context.clock
  const asOfMs = parseIsoDate(context.clock.asOfDate)
  const sampler = new TimeSampler(context.clock, pools.seasonality.profiles.webTraffic)
  const campaignRandom = context.random("campaigns")
  const campaigns = buildCampaigns(context, campaignRandom)

  const experiments: Experiment[] = pool.experiments
    .map((spec) => {
      const startedAt = startOfDay(asOfMs - spec.startDaysAgo * MS_PER_DAY) + 9 * MS_PER_HOUR
      const plannedEnd = startedAt + spec.durationDays * MS_PER_DAY
      const actualEnd = spec.stoppedEarly
        ? startedAt + Math.round(spec.durationDays / 2) * MS_PER_DAY
        : plannedEnd
      const running = actualEnd > endMs
      return {
        id: 0,
        spec,
        status: running ? "running" : spec.stoppedEarly ? "stopped" : "completed",
        startedAt,
        endedAt: running ? null : actualEnd,
        assignments: new Map<Visitor, "control" | "treatment" | null>(),
      }
    })
    .filter((experiment) => experiment.startedAt >= startMs && experiment.startedAt < endMs)
    .sort((left, right) => left.startedAt - right.startedAt)
  experiments.forEach((experiment, index) => {
    experiment.id = index + 1
  })

  const visitorRandom = context.random("visitors")
  const sessionCount = context.scaled(pools.volumes.web.sessions, 200)
  const visitorCount = Math.max(10, Math.round(sessionCount * pools.volumes.web.visitorsPerSession))
  const customerCount = context.scaled(pools.volumes.ecommerce.customers, 50)
  const devicePicker = weightedPicker(pool.devices)
  const countryPicker = weightedPicker(pool.trafficCountries)
  const botPicker = weightedPicker(pool.botUserAgents)
  const visitors: Visitor[] = []
  const visitorWeights: number[] = []
  for (let index = 0; index < visitorCount; index += 1) {
    const device = devicePicker.pick(visitorRandom)
    visitors.push({
      index,
      id: `${pool.visitorIdPrefix}${visitorRandom.hex(16)}`,
      device,
      browser: weightedPicker(device.browsers).pick(visitorRandom).value,
      os: weightedPicker(device.operatingSystems).pick(visitorRandom).value,
      country: countryPicker.pick(visitorRandom).value,
      customerId: visitorRandom.chance(rates.loggedInShare)
        ? visitorRandom.int(1, customerCount)
        : null,
      bot: null,
    })
    visitorWeights.push(Math.min(60, visitorRandom.pareto(1.3)))
  }
  const visitorPicker = new WeightedPicker(visitors, visitorWeights)
  const desktop =
    pool.devices.find((device) => device.value === "desktop") ??
    (pool.devices[0] as WebPool["devices"][number])
  const botVisitors: Visitor[] = Array.from(
    { length: Math.max(3, Math.round(visitorCount * rates.botSessionShare * 0.4)) },
    (_value, index) => ({
      index: visitorCount + index,
      id: `${pool.visitorIdPrefix}${visitorRandom.hex(16)}`,
      device: desktop,
      browser: weightedPicker(desktop.browsers).pick(visitorRandom).value,
      os: weightedPicker(desktop.operatingSystems).pick(visitorRandom).value,
      country: countryPicker.pick(visitorRandom).value,
      customerId: null,
      bot: botPicker.pick(visitorRandom).value,
    }),
  )

  const sessionRandom = context.random("sessions")
  const starts = Array.from({ length: sessionCount }, () =>
    sampler.sampleTimestamp(sessionRandom),
  ).sort((left, right) => left - right)
  const landingPicker = new WeightedPicker(
    pool.pages,
    pool.pages.map((page) => page.landingWeight),
  )
  const pagePicker = weightedPicker(pool.pages)
  const enginePicker = weightedPicker(pool.searchEngines)
  const referrerPicker = weightedPicker(pool.referrerDomains)
  const signUpPicker = weightedPicker(pool.signUpMethods)
  const productPrices = new Map(
    pool.productSlugs.map((slug) => [
      slug,
      toCents(sessionRandom.logNormal(rates.meanOrderValue / 2, 0.6)),
    ]),
  )
  const resolve = (page: Page, random: Random) =>
    fillTemplate(page.path, {
      product: random.pick(pool.productSlugs),
      category: random.pick(pool.categorySlugs),
    })

  const sessions: Session[] = []
  const assignments: Assignment[] = []
  let orderSequence = 0
  for (let index = 0; index < starts.length; index += 1) {
    const startedAt = starts[index] as number
    const random = sessionRandom
    const isBot = random.chance(rates.botSessionShare)
    const visitor = isBot ? random.pick(botVisitors) : visitorPicker.pick(random)
    const activeCampaigns = campaigns.filter(
      (campaign) =>
        campaign.startsOn <= startedAt && (campaign.endsOn ?? endMs) + MS_PER_DAY > startedAt,
    )
    let campaign: Campaign | null = null
    let trafficSource = "direct"
    let referrerDomain: string | null = null
    if (!isBot && activeCampaigns.length > 0 && random.chance(rates.campaignShare)) {
      campaign = new WeightedPicker(
        activeCampaigns,
        activeCampaigns.map((candidate) => candidate.weight),
      ).pick(random)
      trafficSource = "campaign"
    } else if (!isBot && random.chance(rates.organicShare)) {
      trafficSource = "organic_search"
      referrerDomain = enginePicker.pick(random).value
    } else if (!isBot && random.chance(rates.referralShare)) {
      trafficSource = "referral"
      referrerDomain = referrerPicker.pick(random).value
    }

    let lift = 1
    let cartLift = 1
    for (const experiment of experiments) {
      if (isBot || startedAt < experiment.startedAt || startedAt > (experiment.endedAt ?? endMs)) {
        continue
      }
      let variant = experiment.assignments.get(visitor)
      if (variant === undefined) {
        variant = random.chance(experiment.spec.trafficAllocation)
          ? random.chance(0.5)
            ? "treatment"
            : "control"
          : null
        experiment.assignments.set(visitor, variant)
        if (variant !== null) {
          assignments.push({ experiment, visitor, variant, assignedAt: startedAt })
        }
      }
      if (variant === "treatment") {
        if (experiment.spec.primaryMetric === pool.experimentMetrics.addToCart) {
          cartLift *= experiment.spec.treatmentLift
        } else {
          lift *= experiment.spec.treatmentLift
        }
      }
    }

    const pageCount = isBot
      ? random.int(BOT_MIN_PAGES, BOT_MAX_PAGES)
      : Math.min(rates.maxPageViews, 1 + random.geometric(rates.meanExtraPageViews))
    const pageViews: PageView[] = []
    let cursor = startedAt
    let previous: string | null = null
    const viewedProducts: string[] = []
    const events: EventRecord[] = []
    const event = (
      name: string,
      pagePath: string | null,
      at: number,
      properties: Record<string, unknown>,
    ) => {
      events.push({ name, pagePath, at, properties: JSON.stringify(properties) })
    }
    event(names.sessionStart, null, startedAt, { engagement_time_msec: random.int(100, 3000) })
    for (let view = 0; view < pageCount; view += 1) {
      const page = view === 0 ? landingPicker.pick(random) : pagePicker.pick(random)
      const path = resolve(page, random)
      const timeOnPage = isBot ? random.int(200, 2500) : Math.round(random.logNormal(38000, 0.9))
      const last = view === pageCount - 1
      pageViews.push({
        path,
        pageType: page.pageType,
        referrer: previous,
        viewedAt: cursor,
        timeOnPageMs: last ? null : timeOnPage,
      })
      if (!isBot) {
        if (random.chance(rates.scrollProbability)) {
          event(names.scroll, path, cursor + Math.round(timeOnPage * 0.4), {
            percent_scrolled: random.pick(pool.scrollDepths),
          })
          if (random.chance(0.35)) {
            event(names.scroll, path, cursor + Math.round(timeOnPage * 0.8), {
              percent_scrolled: random.pick(pool.scrollDepths),
            })
          }
        }
        if (page.pageType === pool.pageTypes.product) {
          const slug = path.split("/").pop() ?? ""
          viewedProducts.push(slug)
          event(names.viewItem, path, cursor + 400, {
            item_id: slug,
            price: (productPrices.get(slug) ?? 0) / 100,
            currency: pool.siteCurrency,
          })
        } else if (page.pageType === pool.pageTypes.category) {
          event(names.viewItemList, path, cursor + 300, {
            item_list_id: path.split("/").pop() ?? "",
          })
        } else if (
          page.pageType === pool.pageTypes.search ||
          (view === 0 && random.chance(rates.searchProbability))
        ) {
          event(names.search, path, cursor + 800, { search_term: random.pick(pool.searchTerms) })
        }
        if (random.chance(rates.ctaClickProbability)) {
          event(names.clickCta, path, cursor + Math.round(timeOnPage * 0.6), {
            cta_id: random.pick(pool.ctaIds),
          })
        }
      }
      previous = path
      cursor += timeOnPage
    }
    const endedAt = Math.min(endMs, cursor)
    if (!isBot) {
      const lastPath = pageViews[pageViews.length - 1]?.path ?? null
      if (visitor.customerId !== null && random.chance(rates.loginProbability)) {
        event(names.login, lastPath, startedAt + 1500, { method: signUpPicker.pick(random).value })
      } else if (visitor.customerId === null && random.chance(rates.signUpProbability)) {
        event(names.signUp, lastPath, endedAt, { method: signUpPicker.pick(random).value })
      }
      if (random.chance(rates.newsletterProbability)) {
        event(names.newsletterSubscribe, lastPath, endedAt, {
          placement: random.pick(pool.newsletterPlacements),
        })
      }
      if (
        viewedProducts.length > 0 &&
        random.chance(Math.min(0.95, rates.addToCartProbability * cartLift))
      ) {
        const item = random.pick(viewedProducts)
        const price = (productPrices.get(item) ?? 0) / 100
        const quantity = random.chance(0.85) ? 1 : 2
        const cartAt = Math.max(
          startedAt,
          endedAt - Math.round(random.float(0.3, 0.6) * (endedAt - startedAt)),
        )
        event(names.addToCart, fillTemplate(funnel.product, { product: item }), cartAt, {
          item_id: item,
          quantity,
          value: price * quantity,
          currency: pool.siteCurrency,
        })
        if (random.chance(rates.removeFromCartProbability)) {
          event(names.removeFromCart, funnel.cart, cartAt + 20000, { item_id: item, quantity: 1 })
        } else if (random.chance(rates.checkoutProbability)) {
          const value = Math.round(price * quantity * random.float(1, 2.4) * 100) / 100
          const items = quantity + random.int(0, 2)
          event(names.beginCheckout, funnel.checkout, cartAt + 45000, {
            value,
            currency: pool.siteCurrency,
            items,
          })
          if (random.chance(rates.paymentInfoProbability)) {
            event(names.addPaymentInfo, funnel.checkout, cartAt + 90000, {
              payment_type: random.pick(pool.paymentTypes),
            })
            if (random.chance(Math.min(0.98, rates.purchaseProbability * lift))) {
              orderSequence += 1
              event(names.purchase, funnel.confirmation, cartAt + 120000, {
                transaction_id: `${pool.orderReferencePrefix}-${padNumber(orderSequence, 7)}`,
                value,
                currency: pool.siteCurrency,
                items,
              })
            }
          }
        }
      }
    }
    events.sort((left, right) => left.at - right.at)
    sessions.push({
      id: index + 1,
      sequence: index,
      visitor,
      campaign,
      trafficSource,
      referrerDomain,
      startedAt,
      endedAt: Math.max(startedAt, endedAt, ...events.map((item) => Math.min(endMs, item.at))),
      dropped: random.chance(rates.droppedSessionShare),
      pageViews,
      events,
    })
  }

  const keptSessions = sessions.filter((session) => !session.dropped)
  const pageViewRows = keptSessions.flatMap((session) =>
    session.pageViews.map((view) => ({ session, view })),
  )
  const eventRows = sessions.flatMap((session) =>
    session.events.filter((item) => item.at <= endMs).map((item) => ({ session, item })),
  )
  assignments.sort(
    (left, right) => left.assignedAt - right.assignedAt || left.visitor.index - right.visitor.index,
  )

  return [
    defineTable(
      "campaigns",
      [
        "campaign_id",
        "campaign_name",
        "channel",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "budget_amount",
        "currency",
        "starts_on",
        "ends_on",
      ],
      campaigns,
      (campaign): Row => [
        campaign.id,
        campaign.name,
        campaign.channel,
        campaign.utmSource,
        campaign.utmMedium,
        campaign.utmCampaign,
        money(campaign.budgetCents),
        pool.siteCurrency,
        formatDate(campaign.startsOn),
        campaign.endsOn === null ? null : formatDate(campaign.endsOn),
      ],
    ),
    defineTable(
      "sessions",
      [
        "session_id",
        "visitor_id",
        "customer_id",
        "campaign_id",
        "traffic_source",
        "referrer_domain",
        "landing_path",
        "device_type",
        "browser",
        "operating_system",
        "user_agent_family",
        "country_code",
        "started_at",
        "ended_at",
        "page_view_count",
      ],
      keptSessions,
      (session): Row => [
        session.id,
        session.visitor.id,
        session.visitor.customerId,
        session.campaign?.id ?? null,
        session.trafficSource,
        session.referrerDomain,
        session.pageViews[0]?.path ?? "/",
        session.visitor.device.value,
        session.visitor.browser,
        session.visitor.os,
        session.visitor.bot ?? session.visitor.browser,
        session.visitor.country,
        formatTimestamp(session.startedAt),
        formatTimestamp(session.endedAt),
        session.pageViews.length,
      ],
    ),
    defineTable(
      "page_views",
      [
        "page_view_id",
        "session_id",
        "page_path",
        "page_type",
        "referrer_path",
        "viewed_at",
        "time_on_page_ms",
      ],
      pageViewRows,
      ({ session, view }, index): Row => [
        index + 1,
        session.id,
        view.path,
        view.pageType,
        view.referrer,
        formatTimestamp(Math.min(endMs, view.viewedAt)),
        view.timeOnPageMs,
      ],
    ),
    defineTable(
      "events",
      ["event_id", "session_id", "visitor_id", "event_name", "page_path", "event_at", "properties"],
      eventRows,
      ({ session, item }, index): Row => [
        index + 1,
        session.id,
        session.visitor.id,
        item.name,
        item.pagePath,
        formatTimestamp(item.at),
        item.properties,
      ],
    ),
    defineTable(
      "experiments",
      [
        "experiment_id",
        "experiment_key",
        "experiment_name",
        "hypothesis",
        "primary_metric",
        "status",
        "traffic_allocation",
        "started_at",
        "ended_at",
      ],
      experiments,
      (experiment): Row => [
        experiment.id,
        experiment.spec.key,
        experiment.spec.name,
        experiment.spec.hypothesis,
        experiment.spec.primaryMetric,
        experiment.status,
        experiment.spec.trafficAllocation.toFixed(3),
        formatTimestamp(experiment.startedAt),
        experiment.endedAt === null ? null : formatTimestamp(experiment.endedAt),
      ],
    ),
    defineTable(
      "experiment_assignments",
      ["assignment_id", "experiment_id", "visitor_id", "variant", "assigned_at"],
      assignments,
      (assignment, index): Row => [
        index + 1,
        assignment.experiment.id,
        assignment.visitor.id,
        assignment.variant,
        formatTimestamp(assignment.assignedAt),
      ],
    ),
  ]
}
