import { z } from "zod"
import { readJsonAsset } from "./files"
import { DATASET_ASSET_PATHS, assetPath } from "./paths"

const weight = z.number().positive()
const probability = z.number().min(0).max(1)
const range = z.tuple([z.number(), z.number()])
const currencyCode = z.string().length(3)
const countryCode = z.string().length(2)

export const weightedValueSchema = z.object({ value: z.string().min(1), weight })
export type WeightedValue = z.infer<typeof weightedValueSchema>

const weightedValues = z.array(weightedValueSchema).min(1)

export const peoplePoolSchema = z.object({
  firstNames: z.array(z.string().min(1)).min(50),
  lastNames: z.array(z.string().min(1)).min(50),
  emailDomains: weightedValues,
})
export type PeoplePool = z.infer<typeof peoplePoolSchema>

export const countrySchema = z.object({
  code: countryCode,
  name: z.string(),
  currency: currencyCode,
  region: z.enum(["EMEA", "AMER", "APAC"]),
  phonePrefix: z.string(),
  vatRate: z.number().min(0).max(1),
  postalPattern: z.string().min(1),
  residentWeight: z.number().min(0),
  travelWeight: z.number().min(0),
  onlineHubWeight: z.number().min(0),
})
export type Country = z.infer<typeof countrySchema>

export const citySchema = z.object({ name: z.string(), countryCode, weight })
export type City = z.infer<typeof citySchema>

export const geographyPoolSchema = z.object({
  countries: z.array(countrySchema).min(1),
  cities: z.array(citySchema).min(1),
  streetNames: z.array(z.string()).min(10),
})
export type GeographyPool = z.infer<typeof geographyPoolSchema>

export const currencySchema = z.object({
  code: currencyCode,
  name: z.string(),
  minorUnits: z.number().int().min(0).max(3),
  eurRate: z.number().positive(),
  dailyVolatility: z.number().min(0),
  meanReversion: z.number().min(0).max(1),
})
export type Currency = z.infer<typeof currencySchema>

export const currenciesPoolSchema = z.object({
  baseCurrency: currencyCode,
  rateSource: z.string(),
  currencies: z.array(currencySchema).min(1),
})
export type CurrenciesPool = z.infer<typeof currenciesPoolSchema>

export const seasonalityProfileSchema = z.object({
  growth: z.number(),
  weekday: z.array(z.number().positive()).length(7),
  month: z.array(z.number().positive()).length(12),
  hour: z.array(z.number().min(0)).length(24),
})
export type SeasonalityProfile = z.infer<typeof seasonalityProfileSchema>

export const seasonalityPoolSchema = z.object({
  profiles: z.object({
    onboarding: seasonalityProfileSchema,
    cardPayments: seasonalityProfileSchema,
    transfers: seasonalityProfileSchema,
    onlineOrders: seasonalityProfileSchema,
    webTraffic: seasonalityProfileSchema,
    officeHours: seasonalityProfileSchema,
  }),
})
export type SeasonalityPool = z.infer<typeof seasonalityPoolSchema>

export const volumesPoolSchema = z.object({
  windowMonths: z.number().int().min(3).max(60),
  fintech: z.object({
    accountHolders: z.number().int().positive(),
    merchants: z.number().int().positive(),
    transactions: z.number().int().positive(),
    transfers: z.number().int().positive(),
    fraudAlerts: z.number().int().positive(),
    disputes: z.number().int().positive(),
    loans: z.number().int().positive(),
  }),
  ecommerce: z.object({
    customers: z.number().int().positive(),
    products: z.number().int().positive(),
    orders: z.number().int().positive(),
    meanItemsPerOrder: z.number().positive(),
  }),
  hr: z.object({
    employees: z.number().int().positive(),
    companyAgeMonths: z.number().int().positive(),
  }),
  web: z.object({
    sessions: z.number().int().positive(),
    visitorsPerSession: z.number().positive(),
    events: z.number().int().positive(),
  }),
  finance: z.object({ invoices: z.number().int().positive() }),
})
export type VolumesPool = z.infer<typeof volumesPoolSchema>

export const merchantCategorySchema = z.object({
  mcc: z.string().regex(/^\d{4}$/),
  name: z.string(),
  group: z.string(),
  transactionWeight: z.number().min(0),
  merchantWeight: z.number().positive(),
  meanAmountEur: z.number().positive(),
  amountSigma: z.number().positive(),
  highRisk: z.boolean(),
  onlineShare: probability,
  nameSuffixes: z.array(z.string()).min(1),
})
export type MerchantCategory = z.infer<typeof merchantCategorySchema>

export const heavyMerchantSchema = z.object({
  name: z.string(),
  mcc: z.string().regex(/^\d{4}$/),
  countryCode,
  online: z.boolean(),
  weightMultiplier: weight,
})
export type HeavyMerchant = z.infer<typeof heavyMerchantSchema>

export const fraudRuleSchema = z.object({ code: z.string(), name: z.string(), weight })
export const disputeReasonSchema = z.object({
  value: z.string(),
  networkReasonCode: z.string(),
  weight: z.number().min(0),
})
export const loanProductSchema = z.object({
  value: z.string(),
  weight,
  principalRange: range,
  terms: z.array(z.number().int().positive()).min(1),
  rateRange: range,
})
export type LoanProduct = z.infer<typeof loanProductSchema>

export const referenceTemplateSchema = z.object({ template: z.string(), weight })

export const fintechPoolSchema = z.object({
  bankCode: z.string(),
  customerNumberPrefix: z.string(),
  plans: weightedValues,
  riskRatings: weightedValues,
  cardNetworks: weightedValues,
  dailyLimits: z.object({
    physical: z.number(),
    virtual: z.number(),
    premium: z.number(),
    business: z.number(),
  }),
  overdraftLimits: z.array(z.object({ value: z.number().min(0), weight })).min(1),
  merchantCategories: z.array(merchantCategorySchema).min(5),
  atmMcc: z.string(),
  merchantStems: z.array(z.string()).min(20),
  heavyMerchants: z.array(heavyMerchantSchema),
  declineReasons: weightedValues,
  fraudDeclineReason: z.string(),
  fraudRules: z.array(fraudRuleSchema).min(1),
  disputeReasons: z.array(disputeReasonSchema).min(1),
  disputeRoles: z.object({ fraud: z.string(), duplicate: z.string(), partialAmount: z.string() }),
  transferSchemes: z.object({
    internal: z.string(),
    fallback: z.string(),
    byCurrency: z.array(z.object({ currency: currencyCode, schemes: weightedValues })),
    settlementSeconds: z.array(z.object({ scheme: z.string(), range })).min(1),
  }),
  analystCount: z.number().int().positive(),
  kycProviders: weightedValues,
  identityDocuments: weightedValues,
  kycFailureReasons: z.array(z.string()).min(1),
  addressDocuments: weightedValues,
  sanctionLists: z.array(z.string()).min(1),
  employers: z.array(z.string()).min(5),
  payees: z
    .array(
      z.object({
        name: z.string(),
        reference: z.string(),
        meanAmountEur: z.number().positive(),
        weight,
      }),
    )
    .min(5),
  inboundReferences: z.array(referenceTemplateSchema).min(1),
  internalReferences: z.array(referenceTemplateSchema).min(1),
  initialDepositReference: z.string(),
  closurePayoutReference: z.string(),
  monthNames: z.array(z.string()).length(12),
  loanProducts: z.array(loanProductSchema).min(1),
  glAccounts: z.object({
    customerDeposits: z.string(),
    cardSchemeSettlement: z.string(),
    atmNetworkSettlement: z.string(),
    paymentClearing: z.string(),
    balanceMigration: z.string(),
  }),
  rates: z.object({
    savingsAccountShare: probability,
    businessAccountShare: probability,
    virtualCardShare: probability,
    cardReplacementShare: probability,
    preWindowHolderShare: probability,
    preWindowMonths: z.number().int().positive(),
    holderClosedShare: probability,
    holderSuspendedShare: probability,
    accountFrozenShare: probability,
    proofOfAddressShare: probability,
    kycFailureShare: probability,
    kycManualReviewShare: probability,
    atmShare: probability,
    crossBorderShare: probability,
    declineShare: probability,
    highRiskDeclineMultiplier: z.number().positive(),
    reversalShare: probability,
    refundShare: probability,
    unmappedMerchantShare: probability,
    duplicateSwipeShare: probability,
    currencyMismatchShareOfCrossBorder: probability,
    negativeBalanceAccountShare: probability,
    settlementLagHours: range,
    transferFailureShare: probability,
    transferReturnShare: probability,
    fraudDisputeWithoutAlertShare: probability,
    loanBehaviour: z.object({
      reliableShare: probability,
      occasionalShare: probability,
      occasionalLateProbability: probability,
      occasionalMissProbability: probability,
      delinquentStartRange: range,
      partialPaymentProbability: probability,
      earlyPayoffShare: probability,
      defaultAfterConsecutiveMisses: z.number().int().positive(),
    }),
  }),
})
export type FintechPool = z.infer<typeof fintechPoolSchema>

export const productLeafCategorySchema = z.object({
  name: z.string(),
  slug: z.string(),
  weight,
  meanPrice: z.number().positive(),
  priceSigma: z.number().positive(),
  weightGrams: range,
  nouns: z.array(z.string()).min(1),
})
export const productCategorySchema = z.object({
  name: z.string(),
  slug: z.string(),
  children: z.array(productLeafCategorySchema).min(1),
})
export type ProductCategory = z.infer<typeof productCategorySchema>

export const promotionTemplateSchema = z.object({
  codePrefix: z.string(),
  description: z.string(),
  discountType: z.enum(["percent", "fixed_amount", "free_shipping"]),
  discountValue: z.number().min(0),
  minOrderAmount: z.number().nullable(),
  month: z.number().int().min(1).max(12),
  startDay: z.number().int().min(1).max(28),
  durationDays: z.number().int().positive(),
})
export type PromotionTemplate = z.infer<typeof promotionTemplateSchema>

export const ecommercePoolSchema = z.object({
  orderNumberPrefix: z.string(),
  skuPrefix: z.string(),
  paymentReferencePrefix: z.string(),
  preWindowCustomerShare: probability,
  preWindowMonths: z.number().int().positive(),
  storeCurrencies: z.array(z.object({ countryCode, currency: currencyCode })),
  defaultCurrency: currencyCode,
  categories: z.array(productCategorySchema).min(1),
  brands: z.array(z.string()).min(10),
  productAdjectives: z.array(z.string()).min(10),
  warehouses: z.array(z.object({ code: z.string(), countryCode, weight })).min(1),
  carriers: z.array(z.object({ name: z.string(), trackingPrefix: z.string(), weight })).min(1),
  serviceLevels: weightedValues,
  returnReasons: weightedValues,
  paymentMethods: weightedValues,
  salesChannels: weightedValues,
  promotions: z.array(promotionTemplateSchema).min(1),
  welcomePromotion: promotionTemplateSchema.omit({
    month: true,
    startDay: true,
    durationDays: true,
  }),
  freeShippingThreshold: z.number().positive(),
  shippingFees: z.object({ standard: z.number(), express: z.number(), next_day: z.number() }),
  loyaltyTiers: z.array(z.object({ value: z.string(), minOrders: z.number().int().min(0) })).min(1),
  rates: z.object({
    duplicateCustomerShare: probability,
    marketingOptInShare: probability,
    billingAddressShare: probability,
    extraShippingAddressShare: probability,
    productActiveShare: probability,
    productLaunchedInWindowShare: probability,
    inventoryPresenceShare: probability,
    promotionUsageShare: probability,
    cancellationShare: probability,
    failedPaymentAttemptShare: probability,
    latePaymentShare: probability,
    missingShipDateShare: probability,
    lostShipmentShare: probability,
    returnShare: probability,
    returnOverQuantityShare: probability,
    repeatCustomerAlpha: z.number().positive(),
  }),
})
export type EcommercePool = z.infer<typeof ecommercePoolSchema>

export const hrPoolSchema = z.object({
  employeeNumberPrefix: z.string(),
  emailDomain: z.string(),
  locations: z
    .array(
      z.object({
        officeName: z.string(),
        city: z.string(),
        countryCode,
        region: z.enum(["EMEA", "AMER", "APAC"]),
        isRemoteHub: z.boolean(),
        openedMonthsAgo: z.number().int().positive(),
        currency: currencyCode,
        salaryFactor: z.number().positive(),
        weight,
      }),
    )
    .min(1),
  departments: z
    .array(
      z.object({
        name: z.string(),
        parent: z.string().nullable(),
        costCenterCode: z.string(),
        family: z.string(),
        weight: z.number().min(0),
      }),
    )
    .min(1),
  jobFamilies: z.record(z.string(), z.record(z.string(), z.string())),
  levels: z
    .array(
      z.object({
        level: z.string(),
        rank: z.number().int().positive(),
        weight,
        salaryRange: range,
        bonusTargetPct: z.number().min(0),
      }),
    )
    .min(2),
  leaveTypes: z
    .array(z.object({ value: z.string(), weight, dayRange: range, noticeDays: range }))
    .min(1),
  terminationReasons: weightedValues,
  employmentTypes: weightedValues,
  ratingWeights: z.array(z.number().positive()).length(5),
  rates: z.object({
    meanTenureMonths: z.number().positive(),
    monthsPerPromotion: z.number().positive(),
    transferShare: probability,
    overlappingHistoryShare: probability,
    onLeaveShare: probability,
    annualRaiseRange: range,
    promotionRaiseRange: range,
    leaveRequestsPerMonth: z.number().positive(),
    leaveRejectionShare: probability,
    leaveCancellationShare: probability,
    selfRatingShare: probability,
    uncalibratedShareLatestPeriod: probability,
    annualReviewMonth: z.number().int().min(1).max(12),
  }),
})
export type HrPool = z.infer<typeof hrPoolSchema>

export const webPoolSchema = z.object({
  visitorIdPrefix: z.string(),
  siteCurrency: currencyCode,
  campaignTemplates: z
    .array(
      z.object({
        name: z.string(),
        channel: z.string(),
        utmSource: z.string(),
        utmMedium: z.string(),
        alwaysOn: z.boolean(),
        durationDays: range,
        budgetRange: range,
        weight,
      }),
    )
    .min(1),
  campaignThemes: z.array(z.string()).min(1),
  campaignsPerQuarter: z.number().int().positive(),
  pages: z
    .array(
      z.object({
        path: z.string(),
        pageType: z.string(),
        weight,
        landingWeight: z.number().min(0),
      }),
    )
    .min(5),
  productSlugs: z.array(z.string()).min(5),
  categorySlugs: z.array(z.string()).min(3),
  searchTerms: z.array(z.string()).min(5),
  referrerDomains: weightedValues,
  searchEngines: weightedValues,
  devices: z
    .array(
      z.object({
        value: z.enum(["desktop", "mobile", "tablet"]),
        weight,
        browsers: weightedValues,
        operatingSystems: weightedValues,
      }),
    )
    .min(1),
  botUserAgents: weightedValues,
  trafficCountries: weightedValues,
  experiments: z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        hypothesis: z.string(),
        primaryMetric: z.string(),
        startDaysAgo: z.number().int().positive(),
        durationDays: z.number().int().positive(),
        trafficAllocation: probability,
        treatmentLift: z.number().positive(),
        stoppedEarly: z.boolean(),
      }),
    )
    .min(1),
  eventNames: z.object({
    sessionStart: z.string(),
    scroll: z.string(),
    viewItem: z.string(),
    viewItemList: z.string(),
    search: z.string(),
    addToCart: z.string(),
    removeFromCart: z.string(),
    beginCheckout: z.string(),
    addPaymentInfo: z.string(),
    purchase: z.string(),
    signUp: z.string(),
    login: z.string(),
    newsletterSubscribe: z.string(),
    clickCta: z.string(),
  }),
  signUpMethods: weightedValues,
  ctaIds: z.array(z.string()).min(1),
  newsletterPlacements: z.array(z.string()).min(1),
  paymentTypes: z.array(z.string()).min(1),
  scrollDepths: z.array(z.number().int().positive()).min(1),
  orderReferencePrefix: z.string(),
  experimentMetrics: z.object({ addToCart: z.string() }),
  funnelPaths: z.object({
    product: z.string(),
    cart: z.string(),
    checkout: z.string(),
    confirmation: z.string(),
  }),
  pageTypes: z.object({
    product: z.string(),
    category: z.string(),
    search: z.string(),
    cart: z.string(),
    checkout: z.string(),
    confirmation: z.string(),
  }),
  rates: z.object({
    campaignShare: probability,
    organicShare: probability,
    referralShare: probability,
    loggedInShare: probability,
    botSessionShare: probability,
    droppedSessionShare: probability,
    meanExtraPageViews: z.number().positive(),
    maxPageViews: z.number().int().positive(),
    scrollProbability: probability,
    ctaClickProbability: probability,
    searchProbability: probability,
    addToCartProbability: probability,
    removeFromCartProbability: probability,
    checkoutProbability: probability,
    paymentInfoProbability: probability,
    purchaseProbability: probability,
    signUpProbability: probability,
    loginProbability: probability,
    newsletterProbability: probability,
    meanOrderValue: z.number().positive(),
  }),
})
export type WebPool = z.infer<typeof webPoolSchema>

export const financePoolSchema = z.object({
  functionalCurrency: currencyCode,
  homeCountry: countryCode,
  invoicePrefixes: z.object({ payable: z.string(), receivable: z.string() }),
  referencePrefixes: z.object({ payroll: z.string(), accrual: z.string() }),
  ledgerDescriptions: z.object({
    tax: z.string(),
    control: z.string(),
    payment: z.string(),
    payroll: z.string(),
    accrual: z.string(),
    accrualReversal: z.string(),
  }),
  costCenters: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        division: z.string(),
        monthlyPayroll: z.number().positive(),
        isActive: z.boolean(),
      }),
    )
    .min(1),
  chartOfAccounts: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
        subtype: z.string(),
        normalBalance: z.enum(["debit", "credit"]),
        isActive: z.boolean(),
      }),
    )
    .min(1),
  systemAccounts: z.object({
    cash: z.string(),
    accountsReceivable: z.string(),
    vatReceivable: z.string(),
    accountsPayable: z.string(),
    vatPayable: z.string(),
    accruedLiabilities: z.string(),
    salaries: z.string(),
  }),
  vendors: z
    .array(
      z.object({
        name: z.string(),
        countryCode,
        currency: currencyCode,
        accountCodes: z.array(z.string()).min(1),
        costCenterCodes: z.array(z.string()).min(1),
        meanLineAmount: z.number().positive(),
        paymentTermsDays: z.number().int().positive(),
        weight,
      }),
    )
    .min(1),
  clients: z
    .array(
      z.object({
        name: z.string(),
        countryCode,
        currency: currencyCode,
        accountCodes: z.array(z.string()).min(1),
        costCenterCodes: z.array(z.string()).min(1),
        meanLineAmount: z.number().positive(),
        paymentTermsDays: z.number().int().positive(),
        weight,
      }),
    )
    .min(1),
  lineDescriptions: z.record(z.string(), z.array(z.string()).min(1)),
  accrualAccountCodes: z.array(z.string()).min(1),
  budgetAccountCodes: z.array(z.string()).min(1),
  exchangeRateCurrencies: z.array(currencyCode).min(1),
  rates: z.object({
    payableShare: probability,
    voidShare: probability,
    draftShareRecent: probability,
    partialPaymentShare: probability,
    latePaymentShare: probability,
    headerMismatchShare: probability,
    meanLinesPerInvoice: z.number().positive(),
    budgetNoise: range,
  }),
})
export type FinancePool = z.infer<typeof financePoolSchema>

export interface Pools {
  people: PeoplePool
  geography: GeographyPool
  currencies: CurrenciesPool
  seasonality: SeasonalityPool
  volumes: VolumesPool
  fintech: FintechPool
  ecommerce: EcommercePool
  hr: HrPool
  web: WebPool
  finance: FinancePool
}

const POOL_FILES = {
  people: ["people.json", peoplePoolSchema],
  geography: ["geography.json", geographyPoolSchema],
  currencies: ["currencies.json", currenciesPoolSchema],
  seasonality: ["seasonality.json", seasonalityPoolSchema],
  volumes: ["volumes.json", volumesPoolSchema],
  fintech: ["fintech.json", fintechPoolSchema],
  ecommerce: ["ecommerce.json", ecommercePoolSchema],
  hr: ["hr.json", hrPoolSchema],
  web: ["web.json", webPoolSchema],
  finance: ["finance.json", financePoolSchema],
} as const

export const POOL_FILE_NAMES: readonly string[] = Object.values(POOL_FILES).map(([file]) => file)

function poolPath(root: string, file: string): string {
  return assetPath(root, DATASET_ASSET_PATHS.pools, file)
}

export async function loadPools(root: string): Promise<Pools> {
  const [
    people,
    geography,
    currencies,
    seasonality,
    volumes,
    fintech,
    ecommerce,
    hr,
    web,
    finance,
  ] = await Promise.all([
    readJsonAsset(poolPath(root, POOL_FILES.people[0]), POOL_FILES.people[1]),
    readJsonAsset(poolPath(root, POOL_FILES.geography[0]), POOL_FILES.geography[1]),
    readJsonAsset(poolPath(root, POOL_FILES.currencies[0]), POOL_FILES.currencies[1]),
    readJsonAsset(poolPath(root, POOL_FILES.seasonality[0]), POOL_FILES.seasonality[1]),
    readJsonAsset(poolPath(root, POOL_FILES.volumes[0]), POOL_FILES.volumes[1]),
    readJsonAsset(poolPath(root, POOL_FILES.fintech[0]), POOL_FILES.fintech[1]),
    readJsonAsset(poolPath(root, POOL_FILES.ecommerce[0]), POOL_FILES.ecommerce[1]),
    readJsonAsset(poolPath(root, POOL_FILES.hr[0]), POOL_FILES.hr[1]),
    readJsonAsset(poolPath(root, POOL_FILES.web[0]), POOL_FILES.web[1]),
    readJsonAsset(poolPath(root, POOL_FILES.finance[0]), POOL_FILES.finance[1]),
  ])
  return {
    people,
    geography,
    currencies,
    seasonality,
    volumes,
    fintech,
    ecommerce,
    hr,
    web,
    finance,
  }
}
