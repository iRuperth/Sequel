import type { Row } from "../csv"
import type { HrPool } from "../pools"
import { WeightedPicker, weightedPicker, type Random } from "../random"
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  addMonthsUtc,
  formatDate,
  formatTimestamp,
  parseIsoDate,
  startOfDay,
  weekdayIndex,
  yearOf,
} from "../time"
import { fixed, money, padNumber } from "./format"
import { PeopleFactory, type PersonName } from "./people"
import { defineTable, type GeneratedTable, type GeneratorContext } from "./types"

type Level = HrPool["levels"][number]
type Department = HrPool["departments"][number] & { id: number; headId: number | null }
type Location = HrPool["locations"][number] & { id: number; openedOn: number }

const YEAR_MS = 365.25 * MS_PER_DAY
const WEEKEND_START = 5

interface Stint {
  department: Department
  level: Level
  start: number
  end: number | null
  reason: string
}

interface Employee {
  id: number
  sequence: number
  name: PersonName
  email: string
  birthMs: number
  hireMs: number
  terminationMs: number | null
  terminationReason: string | null
  department: Department
  location: Location
  manager: Employee | null
  level: Level
  employmentType: string
  status: string
  isHead: boolean
  trait: number
  stints: Stint[]
}

interface SalaryRecord {
  employee: Employee
  from: number
  to: number | null
  baseCents: number
  bonusPct: number
  reason: string
}

interface Review {
  employee: Employee
  reviewer: Employee | null
  period: string
  periodEnd: number
  selfRating: number | null
  managerRating: number
  calibratedRating: number | null
  submittedAt: number
}

interface LeaveRequest {
  employee: Employee
  type: string
  start: number
  end: number
  days: number
  status: string
  requestedAt: number
  decidedBy: Employee | null
  decidedAt: number | null
}

function officeTime(random: Random, dayMs: number): number {
  return startOfDay(dayMs) + random.int(8, 18) * MS_PER_HOUR + random.int(0, 3599) * 1000
}

function nextWeekday(ms: number): number {
  let day = startOfDay(ms)
  while (weekdayIndex(day) >= WEEKEND_START) {
    day += MS_PER_DAY
  }
  return day
}

function clampRating(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)))
}

export function generateHr(context: GeneratorContext): GeneratedTable[] {
  const pools = context.pools
  const pool = pools.hr
  const people = new PeopleFactory(pools.people)
  const asOfMs = parseIsoDate(context.clock.asOfDate)
  const windowStart = context.clock.startMs
  const companyStart = addMonthsUtc(asOfMs, -pools.volumes.hr.companyAgeMonths)
  const random = context.random("employees")
  const levels = [...pool.levels].sort((left, right) => left.rank - right.rank)
  const topLevel = levels[levels.length - 1] as Level
  const directorLevel = levels[levels.length - 2] as Level
  const levelByRank = new Map(levels.map((level) => [level.rank, level]))

  const locations: Location[] = pool.locations.map((location, index) => ({
    ...location,
    id: index + 1,
    openedOn: startOfDay(addMonthsUtc(asOfMs, -location.openedMonthsAgo)),
  }))
  const departments: Department[] = pool.departments.map((department, index) => ({
    ...department,
    id: index + 1,
    headId: null,
  }))
  const departmentByName = new Map(departments.map((department) => [department.name, department]))
  const parentOf = (department: Department) =>
    department.parent === null ? null : (departmentByName.get(department.parent) ?? null)
  const locationPicker = weightedPicker(locations)
  const departmentPicker = new WeightedPicker(
    departments,
    departments.map((department) => department.weight),
  )
  const regularLevels = levels.filter((level) => level.rank < directorLevel.rank)
  const levelPicker = weightedPicker(regularLevels)
  const terminationPicker = weightedPicker(pool.terminationReasons)
  const employmentPicker = weightedPicker(pool.employmentTypes)
  const titleFor = (department: Department, level: Level) =>
    pool.jobFamilies[department.family]?.[level.level] ?? `${department.name} ${level.level}`

  const employees: Employee[] = []
  const emailCounts = new Map<string, number>()
  const create = (
    department: Department,
    level: Level,
    hireMs: number,
    isHead: boolean,
  ): Employee => {
    const name = people.name(random)
    const key = `${name.first}.${name.last}`.toLowerCase()
    const count = (emailCounts.get(key) ?? 0) + 1
    emailCounts.set(key, count)
    const eligibleLocations = locations.filter((location) => location.openedOn <= hireMs)
    const location =
      eligibleLocations.length > 0 ? locationPicker.pick(random) : (locations[0] as Location)
    const finalLocation =
      location.openedOn <= hireMs
        ? location
        : random.pick(eligibleLocations.length > 0 ? eligibleLocations : locations)
    const tenureMs = random.exponential(pool.rates.meanTenureMonths * 30.4 * MS_PER_DAY)
    const terminationMs = isHead ? null : startOfDay(hireMs + tenureMs)
    const terminated = terminationMs !== null && terminationMs < asOfMs
    const employee: Employee = {
      id: 0,
      sequence: employees.length,
      name,
      email: people.workEmail(name, pool.emailDomain, count),
      birthMs: startOfDay(hireMs - random.float(21, 52) * YEAR_MS),
      hireMs,
      terminationMs: terminated ? terminationMs : null,
      terminationReason: terminated ? terminationPicker.pick(random).value : null,
      department,
      location: finalLocation,
      manager: null,
      level,
      employmentType: isHead ? "full_time" : employmentPicker.pick(random).value,
      status: terminated
        ? "terminated"
        : random.chance(pool.rates.onLeaveShare)
          ? "on_leave"
          : "active",
      isHead,
      trait: random.normal() * 0.55,
      stints: [],
    }
    employees.push(employee)
    return employee
  }

  for (const department of departments) {
    const parent = parentOf(department)
    const level = parent === null || parent.parent === null ? topLevel : directorLevel
    const hireMs = nextWeekday(companyStart + random.int(0, 30) * 30 * MS_PER_DAY)
    const head = create(department, level, hireMs, true)
    department.headId = head.sequence
  }
  const total = Math.max(context.scaled(pools.volumes.hr.employees, 60), employees.length + 10)
  const hiringSpan = asOfMs - 7 * MS_PER_DAY - companyStart
  while (employees.length < total) {
    const department = departmentPicker.pick(random)
    const hireMs = nextWeekday(companyStart + Math.pow(random.next(), 0.6) * hiringSpan)
    create(department, levelPicker.pick(random), hireMs, false)
  }

  employees.sort((left, right) => left.hireMs - right.hireMs || left.sequence - right.sequence)
  employees.forEach((employee, index) => {
    employee.id = index + 1
  })
  const bySequence = new Map(employees.map((employee) => [employee.sequence, employee]))
  const headOf = (department: Department | null): Employee | null =>
    department === null || department.headId === null
      ? null
      : (bySequence.get(department.headId) ?? null)

  const managersByDepartment = new Map<Department, Employee[]>()
  for (const employee of employees) {
    if (!employee.isHead && employee.level.rank >= 5) {
      const list = managersByDepartment.get(employee.department) ?? []
      list.push(employee)
      managersByDepartment.set(employee.department, list)
    }
  }
  for (const employee of employees) {
    if (employee.isHead) {
      employee.manager = headOf(parentOf(employee.department))
      continue
    }
    const candidates = (managersByDepartment.get(employee.department) ?? []).filter(
      (candidate) =>
        candidate !== employee &&
        candidate.level.rank > employee.level.rank &&
        candidate.hireMs <= employee.hireMs + 180 * MS_PER_DAY &&
        (employee.terminationMs !== null || candidate.terminationMs === null),
    )
    employee.manager =
      candidates.length > 0 && random.chance(0.85)
        ? random.pick(candidates)
        : headOf(employee.department)
  }

  const historyRandom = context.random("employment_history")
  for (const employee of employees) {
    const endMs = employee.terminationMs ?? asOfMs
    const tenureMonths = Math.max(0, (endMs - employee.hireMs) / (30.4 * MS_PER_DAY))
    const promotions = employee.isHead
      ? 0
      : Math.min(
          employee.level.rank - 1,
          Math.floor(
            (tenureMonths / pool.rates.monthsPerPromotion) * historyRandom.float(0.4, 1.3),
          ),
        )
    const hireLevel = levelByRank.get(employee.level.rank - promotions) ?? employee.level
    const changeTimes = Array.from({ length: promotions }, () =>
      nextWeekday(employee.hireMs + historyRandom.float(0.1, 0.95) * (endMs - employee.hireMs)),
    ).sort((left, right) => left - right)
    const transferAt =
      !employee.isHead &&
      historyRandom.chance(pool.rates.transferShare) &&
      endMs - employee.hireMs > 200 * MS_PER_DAY
        ? nextWeekday(employee.hireMs + historyRandom.float(0.2, 0.8) * (endMs - employee.hireMs))
        : null
    const previousDepartment =
      transferAt === null ? employee.department : departmentPicker.pick(historyRandom)
    const events: { at: number; reason: string; rankDelta: number }[] = changeTimes.map((at) => ({
      at,
      reason: "promotion",
      rankDelta: 1,
    }))
    if (transferAt !== null) {
      events.push({ at: transferAt, reason: "transfer", rankDelta: 0 })
    }
    if (historyRandom.chance(0.04) && endMs - employee.hireMs > 120 * MS_PER_DAY) {
      events.push({
        at: nextWeekday(
          employee.hireMs + historyRandom.float(0.3, 0.9) * (endMs - employee.hireMs),
        ),
        reason: historyRandom.chance(0.5) ? "title_change" : "reorganisation",
        rankDelta: 0,
      })
    }
    events.sort((left, right) => left.at - right.at)
    let rank = hireLevel.rank
    let department = transferAt === null ? employee.department : previousDepartment
    let start = startOfDay(employee.hireMs)
    let reason = "hire"
    for (const event of events) {
      if (event.at <= start) {
        continue
      }
      employee.stints.push({
        department,
        level: levelByRank.get(rank) ?? employee.level,
        start,
        end: event.at - MS_PER_DAY,
        reason,
      })
      rank += event.rankDelta
      if (event.reason === "transfer") {
        department = employee.department
      }
      start = event.at
      reason = event.reason
    }
    employee.stints.push({
      department: employee.department,
      level: employee.level,
      start,
      end: employee.terminationMs,
      reason,
    })
    if (
      employee.stints.length > 1 &&
      historyRandom.chance(pool.rates.overlappingHistoryShare * 2.5)
    ) {
      const index = historyRandom.int(0, employee.stints.length - 2)
      const stint = employee.stints[index] as Stint
      const next = employee.stints[index + 1] as Stint
      stint.end = next.start + historyRandom.int(10, 60) * MS_PER_DAY
    }
  }

  const salaryRandom = context.random("salaries")
  const salaries: SalaryRecord[] = []
  for (const employee of employees) {
    const endMs = employee.terminationMs ?? asOfMs
    const bonusFor = (level: Level) =>
      employee.employmentType === "contractor" ? 0 : level.bonusTargetPct
    const baseFor = (level: Level) =>
      Math.round(
        (salaryRandom.float(level.salaryRange[0], level.salaryRange[1]) *
          employee.location.salaryFactor) /
          100,
      ) * 10000
    const changes: { at: number; reason: string; level: Level }[] = []
    for (const stint of employee.stints.slice(1)) {
      if (stint.reason === "promotion") {
        changes.push({ at: stint.start, reason: "promotion", level: stint.level })
      }
    }
    for (let year = yearOf(employee.hireMs) + 1; year <= yearOf(endMs); year += 1) {
      const at = Date.UTC(year, pool.rates.annualReviewMonth - 1, 1)
      if (at > employee.hireMs + 120 * MS_PER_DAY && at <= endMs) {
        changes.push({
          at,
          reason: salaryRandom.chance(0.04) ? "market_adjustment" : "annual_review",
          level: employee.level,
        })
      }
    }
    changes.sort((left, right) => left.at - right.at)
    const firstLevel = employee.stints[0]?.level ?? employee.level
    let currentLevel = firstLevel
    let base = baseFor(firstLevel)
    const records: SalaryRecord[] = [
      {
        employee,
        from: startOfDay(employee.hireMs),
        to: null,
        baseCents: base,
        bonusPct: bonusFor(firstLevel),
        reason: "hire",
      },
    ]
    for (const change of changes) {
      if (change.reason === "promotion") {
        currentLevel = change.level
        base =
          Math.round((base * (1 + salaryRandom.float(...pool.rates.promotionRaiseRange))) / 10000) *
          10000
      } else {
        const multiplier =
          change.reason === "market_adjustment"
            ? salaryRandom.float(0.06, 0.12)
            : salaryRandom.float(...pool.rates.annualRaiseRange)
        base = Math.round((base * (1 + multiplier)) / 10000) * 10000
      }
      const previous = records[records.length - 1] as SalaryRecord
      if (change.at <= previous.from) {
        continue
      }
      previous.to = change.at - MS_PER_DAY
      records.push({
        employee,
        from: change.at,
        to: null,
        baseCents: base,
        bonusPct: bonusFor(currentLevel),
        reason: change.reason,
      })
    }
    const last = records[records.length - 1] as SalaryRecord
    last.to = employee.terminationMs
    salaries.push(...records)
  }

  const reviewRandom = context.random("performance_reviews")
  const reviews: Review[] = []
  const periods: { label: string; end: number }[] = []
  for (let year = yearOf(windowStart) - 1; year <= yearOf(asOfMs); year += 1) {
    for (const half of [1, 2]) {
      const end = half === 1 ? Date.UTC(year, 5, 30) : Date.UTC(year, 11, 31)
      if (end >= windowStart - 31 * MS_PER_DAY && end + 25 * MS_PER_DAY <= asOfMs) {
        periods.push({ label: `${year}-H${half}`, end })
      }
    }
  }
  const latestPeriod = periods[periods.length - 1]
  const ratingPicker = new WeightedPicker([1, 2, 3, 4, 5], pool.ratingWeights)
  for (const period of periods) {
    for (const employee of employees) {
      if (employee.hireMs > period.end - 90 * MS_PER_DAY) {
        continue
      }
      if (
        employee.terminationMs !== null &&
        employee.terminationMs < period.end + 30 * MS_PER_DAY
      ) {
        continue
      }
      if (employee.employmentType === "contractor") {
        continue
      }
      const managerRating = clampRating(ratingPicker.pick(reviewRandom) + employee.trait)
      const calibrated =
        period === latestPeriod && reviewRandom.chance(pool.rates.uncalibratedShareLatestPeriod)
          ? null
          : clampRating(
              managerRating + (reviewRandom.chance(0.12) ? (reviewRandom.chance(0.5) ? 1 : -1) : 0),
            )
      reviews.push({
        employee,
        reviewer: employee.manager,
        period: period.label,
        periodEnd: period.end,
        selfRating: reviewRandom.chance(pool.rates.selfRatingShare)
          ? clampRating(managerRating + (reviewRandom.chance(0.45) ? 1 : 0))
          : null,
        managerRating,
        calibratedRating: calibrated,
        submittedAt: officeTime(reviewRandom, period.end + reviewRandom.int(5, 24) * MS_PER_DAY),
      })
    }
  }
  reviews.sort(
    (left, right) => left.submittedAt - right.submittedAt || left.employee.id - right.employee.id,
  )

  const leaveRandom = context.random("leave_requests")
  const leaveTypes = weightedPicker(pool.leaveTypes)
  const leaves: LeaveRequest[] = []
  for (const employee of employees) {
    const activeFrom = Math.max(employee.hireMs + 30 * MS_PER_DAY, windowStart)
    const activeTo = Math.min(
      employee.terminationMs ?? asOfMs + 60 * MS_PER_DAY,
      asOfMs + 60 * MS_PER_DAY,
    )
    if (activeTo <= activeFrom) {
      continue
    }
    const months = (activeTo - activeFrom) / (30.4 * MS_PER_DAY)
    const count = leaveRandom.poisson(months * pool.rates.leaveRequestsPerMonth)
    for (let index = 0; index < count; index += 1) {
      const type = leaveTypes.pick(leaveRandom)
      const start = nextWeekday(activeFrom + leaveRandom.next() * (activeTo - activeFrom))
      const days = leaveRandom.int(type.dayRange[0], type.dayRange[1])
      const end = start + (Math.floor((days - 1) / 5) * 7 + ((days - 1) % 5)) * MS_PER_DAY
      const requestedAt = officeTime(
        leaveRandom,
        start - leaveRandom.int(type.noticeDays[0], type.noticeDays[1]) * MS_PER_DAY,
      )
      if (requestedAt > context.clock.endMs || requestedAt < employee.hireMs) {
        continue
      }
      const future = start > asOfMs
      let status = "approved"
      if (future && leaveRandom.chance(0.5)) {
        status = "pending"
      } else if (leaveRandom.chance(pool.rates.leaveRejectionShare)) {
        status = "rejected"
      } else if (leaveRandom.chance(pool.rates.leaveCancellationShare)) {
        status = "cancelled"
      }
      const decidedAt =
        status === "pending"
          ? null
          : Math.min(context.clock.endMs, requestedAt + leaveRandom.int(1, 72) * MS_PER_HOUR)
      leaves.push({
        employee,
        type: type.value,
        start,
        end,
        days: type.value === "sick" ? days : days - (leaveRandom.chance(0.08) ? 0.5 : 0),
        status,
        requestedAt,
        decidedBy: status === "pending" ? null : employee.manager,
        decidedAt,
      })
    }
  }
  leaves.sort(
    (left, right) => left.requestedAt - right.requestedAt || left.employee.id - right.employee.id,
  )

  const histories = employees.flatMap((employee) =>
    employee.stints.map((stint) => ({ employee, stint })),
  )
  return [
    defineTable(
      "locations",
      [
        "location_id",
        "office_name",
        "city",
        "country_code",
        "region",
        "is_remote_hub",
        "opened_on",
      ],
      locations,
      (location): Row => [
        location.id,
        location.officeName,
        location.city,
        location.countryCode,
        location.region,
        location.isRemoteHub,
        formatDate(location.openedOn),
      ],
    ),
    defineTable(
      "departments",
      [
        "department_id",
        "department_name",
        "parent_department_id",
        "cost_center_code",
        "head_employee_id",
      ],
      departments,
      (department): Row => [
        department.id,
        department.name,
        parentOf(department)?.id ?? null,
        department.costCenterCode,
        headOf(department)?.id ?? null,
      ],
    ),
    defineTable(
      "employees",
      [
        "employee_id",
        "employee_number",
        "first_name",
        "last_name",
        "work_email",
        "date_of_birth",
        "hire_date",
        "termination_date",
        "termination_reason",
        "department_id",
        "location_id",
        "manager_id",
        "job_title",
        "job_level",
        "employment_type",
        "status",
      ],
      employees,
      (employee): Row => [
        employee.id,
        `${pool.employeeNumberPrefix}${padNumber(10000 + employee.id, 6)}`,
        employee.name.first,
        employee.name.last,
        employee.email,
        formatDate(employee.birthMs),
        formatDate(employee.hireMs),
        employee.terminationMs === null ? null : formatDate(employee.terminationMs),
        employee.terminationReason,
        employee.department.id,
        employee.location.id,
        employee.manager?.id ?? null,
        titleFor(employee.department, employee.level),
        employee.level.level,
        employee.employmentType,
        employee.status,
      ],
    ),
    defineTable(
      "employment_history",
      [
        "history_id",
        "employee_id",
        "department_id",
        "job_title",
        "job_level",
        "start_date",
        "end_date",
        "change_reason",
      ],
      histories,
      ({ employee, stint }, index): Row => [
        index + 1,
        employee.id,
        stint.department.id,
        titleFor(stint.department, stint.level),
        stint.level.level,
        formatDate(stint.start),
        stint.end === null ? null : formatDate(stint.end),
        stint.reason,
      ],
    ),
    defineTable(
      "salaries",
      [
        "salary_id",
        "employee_id",
        "effective_from",
        "effective_to",
        "base_salary",
        "currency",
        "bonus_target_pct",
        "change_reason",
      ],
      salaries,
      (salary, index): Row => [
        index + 1,
        salary.employee.id,
        formatDate(salary.from),
        salary.to === null ? null : formatDate(salary.to),
        money(salary.baseCents),
        salary.employee.location.currency,
        fixed(salary.bonusPct, 2),
        salary.reason,
      ],
    ),
    defineTable(
      "performance_reviews",
      [
        "review_id",
        "employee_id",
        "reviewer_id",
        "review_period",
        "period_end",
        "self_rating",
        "manager_rating",
        "calibrated_rating",
        "submitted_at",
      ],
      reviews,
      (review, index): Row => [
        index + 1,
        review.employee.id,
        review.reviewer?.id ?? null,
        review.period,
        formatDate(review.periodEnd),
        review.selfRating,
        review.managerRating,
        review.calibratedRating,
        formatTimestamp(review.submittedAt),
      ],
    ),
    defineTable(
      "leave_requests",
      [
        "leave_request_id",
        "employee_id",
        "leave_type",
        "start_date",
        "end_date",
        "working_days",
        "status",
        "requested_at",
        "decided_by",
        "decided_at",
      ],
      leaves,
      (leave, index): Row => [
        index + 1,
        leave.employee.id,
        leave.type,
        formatDate(leave.start),
        formatDate(leave.end),
        fixed(leave.days, 1),
        leave.status,
        formatTimestamp(leave.requestedAt),
        leave.decidedBy?.id ?? null,
        leave.decidedAt === null ? null : formatTimestamp(leave.decidedAt),
      ],
    ),
  ]
}
