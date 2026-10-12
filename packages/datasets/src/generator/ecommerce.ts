import type { Row } from "../csv"
import type { PromotionTemplate } from "../pools"
import { WeightedPicker, weightedPicker } from "../random"
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  addMonthsUtc,
  formatTimestamp,
  yearOf,
} from "../time"
import { money, padNumber, toCents } from "./format"
import { Geography, PeopleFactory, type PersonName } from "./people"
import { PrefixWeightedPicker } from "./prefix-picker"
import { TimeSampler } from "./seasonality"
import { defineTable, type GeneratedTable, type GeneratorContext } from "./types"

interface Customer {
  id: number
  sequence: number
  name: PersonName
  email: string
  phone: string | null
  countryCode: string
  city: string
  currency: string
  optIn: boolean
  createdAt: number
  propensity: number
  orderCount: number
  lastOrderAt: number | null
  defaultAddressId: number
  addresses: Address[]
}

interface Address {
  id: number
  sequence: number
  customer: Customer
  type: "shipping" | "billing"
  street: string
  city: string
  postalCode: string
  countryCode: string
  isDefault: boolean
  createdAt: number
}

interface Category {
  id: number
  parentId: number | null
  name: string
  slug: string
  leaf: {
    weight: number
    meanPrice: number
    priceSigma: number
    weightGrams: [number, number]
    nouns: string[]
  } | null
}

interface Product {
  id: number
  sequence: number
  sku: string
  name: string
  category: Category
  brand: string
  priceCents: number
  costCents: number
  weightGrams: number
  active: boolean
  launchedAt: number
  popularity: number
}

interface Promotion {
  id: number
  code: string
  template: Omit<PromotionTemplate, "month" | "startDay" | "durationDays">
  startsAt: number
  endsAt: number | null
}

interface OrderItem {
  id: number
  lineNumber: number
  product: Product
  quantity: number
  unitCents: number
  discountCents: number
  lineCents: number
  returnedQuantity: number
}

interface Order {
  id: number
  sequence: number
  number: string
  customer: Customer
  addressId: number
  promotion: Promotion | null
  status: string
  channel: string
  currency: string
  subtotalCents: number
  discountCents: number
  shippingCents: number
  taxCents: number
  totalCents: number
  orderedAt: number
  items: OrderItem[]
  deliveredAt: number | null
}

interface Payment {
  order: Order
  method: string
  reference: string
  amountCents: number
  status: string
  attemptedAt: number
  capturedAt: number | null
}

interface Shipment {
  order: Order
  warehouse: string
  carrier: string
  serviceLevel: string
  tracking: string
  status: string
  createdAt: number
  shippedAt: number | null
  deliveredAt: number | null
}

interface ReturnRecord {
  sequence: number
  order: Order
  item: OrderItem
  quantity: number
  reason: string
  status: string
  refundCents: number | null
  requestedAt: number
  processedAt: number | null
}

function caseVariant(email: string): string {
  const [local = "", domain = ""] = email.split("@")
  const variant = local
    .split(/([._])/)
    .map((part) => (part.length > 1 ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join("")
  return variant === local ? `${local.toUpperCase()}@${domain}` : `${variant}@${domain}`
}

function retailPrice(cents: number): number {
  const units = Math.max(2, Math.round(cents / 100))
  return units * 100 - 1
}

export function generateEcommerce(context: GeneratorContext): GeneratedTable[] {
  const pools = context.pools
  const pool = pools.ecommerce
  const rates = pool.rates
  const geography = new Geography(pools.geography)
  const people = new PeopleFactory(pools.people)
  const { startMs, endMs } = context.clock
  const signups = new TimeSampler(context.clock, pools.seasonality.profiles.onboarding)
  const orderTimes = new TimeSampler(context.clock, pools.seasonality.profiles.onlineOrders)
  const currencyByCountry = new Map(
    pool.storeCurrencies.map((entry) => [entry.countryCode, entry.currency]),
  )
  const eurRate = new Map(
    pools.currencies.currencies.map((currency) => [currency.code, currency.eurRate]),
  )
  const toStoreCurrency = (eurCents: number, currency: string) =>
    Math.round(eurCents * (eurRate.get(currency) ?? 1))

  const customerRandom = context.random("customers")
  const preWindowStart = addMonthsUtc(startMs, -pool.preWindowMonths)
  const customerCount = context.scaled(pools.volumes.ecommerce.customers, 50)
  const customers: Customer[] = []
  const usedEmails = new Set<string>()
  const uniqueEmail = (name: PersonName) => {
    let email = people.personalEmail(customerRandom, name).toLowerCase()
    while (usedEmails.has(email)) {
      const [local = "", domain = ""] = email.split("@")
      email = `${local}${customerRandom.int(0, 9)}@${domain}`
    }
    usedEmails.add(email)
    return email
  }
  for (let index = 0; index < customerCount; index += 1) {
    const country = geography.residentCountry(customerRandom)
    const name = people.name(customerRandom)
    const createdAt = customerRandom.chance(pool.preWindowCustomerShare)
      ? preWindowStart + Math.floor(customerRandom.next() * (startMs - preWindowStart))
      : signups.sampleTimestamp(customerRandom)
    customers.push({
      id: 0,
      sequence: index,
      name,
      email: uniqueEmail(name),
      phone: customerRandom.chance(0.68)
        ? geography.phoneNumber(customerRandom, country.code)
        : null,
      countryCode: country.code,
      city: geography.city(customerRandom, country.code),
      currency: currencyByCountry.get(country.code) ?? pool.defaultCurrency,
      optIn: customerRandom.chance(rates.marketingOptInShare),
      createdAt,
      propensity: Math.min(80, customerRandom.pareto(rates.repeatCustomerAlpha)),
      orderCount: 0,
      lastOrderAt: null,
      defaultAddressId: 0,
      addresses: [],
    })
  }
  const duplicateCount = Math.round(customerCount * rates.duplicateCustomerShare)
  for (let index = 0; index < duplicateCount; index += 1) {
    const original = customerRandom.pick(customers.slice(0, customerCount))
    const createdAt = original.createdAt + customerRandom.int(20, 420) * MS_PER_DAY
    if (createdAt >= endMs - MS_PER_DAY) {
      continue
    }
    customers.push({
      ...original,
      sequence: customers.length,
      email: caseVariant(original.email),
      phone: customerRandom.chance(0.5) ? original.phone : null,
      createdAt: Math.max(createdAt, startMs),
      propensity: original.propensity * 0.3,
      addresses: [],
    })
  }
  customers.sort(
    (left, right) => left.createdAt - right.createdAt || left.sequence - right.sequence,
  )
  customers.forEach((customer, index) => {
    customer.id = index + 1
  })

  const addressRandom = context.random("addresses")
  const addresses: Address[] = []
  for (const customer of customers) {
    const make = (
      type: "shipping" | "billing",
      isDefault: boolean,
      createdAt: number,
      sameCity: boolean,
    ) => {
      const address: Address = {
        id: 0,
        sequence: addresses.length,
        customer,
        type,
        street: geography.streetLine(addressRandom),
        city: sameCity ? customer.city : geography.city(addressRandom, customer.countryCode),
        postalCode: geography.postalCode(addressRandom, customer.countryCode),
        countryCode: customer.countryCode,
        isDefault,
        createdAt: Math.min(endMs, createdAt),
      }
      addresses.push(address)
      customer.addresses.push(address)
      return address
    }
    make("shipping", true, customer.createdAt + addressRandom.int(1, 30) * MS_PER_MINUTE, true)
    if (addressRandom.chance(rates.billingAddressShare)) {
      make("billing", true, customer.createdAt + addressRandom.int(1, 60) * MS_PER_MINUTE, true)
    }
    if (addressRandom.chance(rates.extraShippingAddressShare)) {
      const createdAt =
        customer.createdAt + Math.floor(addressRandom.next() * (endMs - customer.createdAt))
      make("shipping", false, createdAt, false)
    }
  }
  addresses.sort(
    (left, right) => left.createdAt - right.createdAt || left.sequence - right.sequence,
  )
  addresses.forEach((address, index) => {
    address.id = index + 1
  })
  for (const customer of customers) {
    customer.defaultAddressId = customer.addresses[0]?.id ?? 0
  }

  const categories: Category[] = []
  for (const parent of pool.categories) {
    const parentCategory: Category = {
      id: categories.length + 1,
      parentId: null,
      name: parent.name,
      slug: parent.slug,
      leaf: null,
    }
    categories.push(parentCategory)
    for (const child of parent.children) {
      categories.push({
        id: categories.length + 1,
        parentId: parentCategory.id,
        name: child.name,
        slug: child.slug,
        leaf: {
          weight: child.weight,
          meanPrice: child.meanPrice,
          priceSigma: child.priceSigma,
          weightGrams: child.weightGrams,
          nouns: child.nouns,
        },
      })
    }
  }
  const leaves = categories.filter((category) => category.leaf !== null)
  const leafPicker = new WeightedPicker(
    leaves,
    leaves.map((category) => category.leaf?.weight ?? 0),
  )

  const productRandom = context.random("products")
  const productCount = context.scaled(pools.volumes.ecommerce.products, 40)
  const products: Product[] = []
  for (let index = 0; index < productCount; index += 1) {
    const category = leafPicker.pick(productRandom)
    const leaf = category.leaf
    if (!leaf) {
      continue
    }
    const priceCents = retailPrice(
      toCents(productRandom.logNormal(leaf.meanPrice, leaf.priceSigma)),
    )
    const launchedAt = productRandom.chance(rates.productLaunchedInWindowShare)
      ? startMs + Math.floor(productRandom.next() * (endMs - startMs - 14 * MS_PER_DAY))
      : startMs - productRandom.int(30, 1100) * MS_PER_DAY + productRandom.int(0, 86399) * 1000
    const brand = productRandom.pick(pool.brands)
    products.push({
      id: 0,
      sequence: index,
      sku: "",
      name: `${brand} ${productRandom.pick(pool.productAdjectives)} ${productRandom.pick(leaf.nouns)}`,
      category,
      brand,
      priceCents,
      costCents: Math.max(50, Math.round(priceCents * productRandom.float(0.35, 0.7))),
      weightGrams: productRandom.int(leaf.weightGrams[0], leaf.weightGrams[1]),
      active: productRandom.chance(rates.productActiveShare),
      launchedAt,
      popularity: Math.min(120, productRandom.pareto(1.05)),
    })
  }
  products.sort(
    (left, right) => left.launchedAt - right.launchedAt || left.sequence - right.sequence,
  )
  products.forEach((product, index) => {
    product.id = index + 1
    product.sku = `${pool.skuPrefix}-${padNumber(100000 + product.id * 7, 7)}`
  })
  const productPicker = new PrefixWeightedPicker(
    products,
    (product) => product.launchedAt,
    (product) => product.popularity * (product.active ? 1 : 0.3),
  )

  const promotions: Promotion[] = [
    {
      id: 0,
      code: `${pool.welcomePromotion.codePrefix}${pool.welcomePromotion.discountValue}`,
      template: pool.welcomePromotion,
      startsAt: preWindowStart,
      endsAt: null,
    },
  ]
  for (let year = yearOf(startMs); year <= yearOf(endMs); year += 1) {
    for (const template of pool.promotions) {
      const startsAt = Date.UTC(year, template.month - 1, template.startDay, 6)
      if (startsAt < startMs || startsAt > endMs) {
        continue
      }
      const endsAt = startsAt + template.durationDays * MS_PER_DAY - MS_PER_HOUR
      promotions.push({
        id: 0,
        code: `${template.codePrefix}${String(year).slice(2)}`,
        template,
        startsAt,
        endsAt: endsAt > endMs ? null : endsAt,
      })
    }
  }
  promotions.sort((left, right) => left.startsAt - right.startsAt)
  promotions.forEach((promotion, index) => {
    promotion.id = index + 1
  })
  const welcome = promotions.find(
    (promotion) => promotion.endsAt === null && promotion.startsAt === preWindowStart,
  )
  const seasonal = promotions.filter((promotion) => promotion !== welcome)

  const orderRandom = context.random("orders")
  const customerPicker = new PrefixWeightedPicker(
    customers,
    (customer) => customer.createdAt,
    (customer) => customer.propensity,
  )
  const channelPicker = weightedPicker(pool.salesChannels)
  const servicePicker = weightedPicker(pool.serviceLevels)
  const orderCount = context.scaled(pools.volumes.ecommerce.orders, 100)
  const meanExtraItems = Math.max(0, pools.volumes.ecommerce.meanItemsPerOrder - 1)
  const orders: Order[] = []
  const orderServiceLevel = new Map<Order, string>()
  for (let index = 0; index < orderCount; index += 1) {
    const orderedAt = orderTimes.sampleTimestamp(orderRandom)
    const customer = customerPicker.pick(orderRandom, orderedAt)
    if (!customer) {
      continue
    }
    const currency = customer.currency
    const itemCount = Math.min(12, 1 + orderRandom.geometric(meanExtraItems))
    const items: OrderItem[] = []
    for (let line = 0; line < itemCount; line += 1) {
      const product = productPicker.pick(orderRandom, orderedAt)
      if (!product) {
        continue
      }
      const roll = orderRandom.next()
      const quantity = roll < 0.82 ? 1 : roll < 0.95 ? 2 : orderRandom.int(3, 4)
      const unitCents =
        currency === pool.defaultCurrency
          ? product.priceCents
          : retailPrice(toStoreCurrency(product.priceCents, currency))
      items.push({
        id: 0,
        lineNumber: items.length + 1,
        product,
        quantity,
        unitCents,
        discountCents: 0,
        lineCents: unitCents * quantity,
        returnedQuantity: 0,
      })
    }
    if (items.length === 0) {
      continue
    }
    const subtotalCents = items.reduce((sum, item) => sum + item.lineCents, 0)
    let promotion: Promotion | null = null
    if (customer.orderCount === 0 && welcome && orderRandom.chance(0.45)) {
      promotion = welcome
    } else {
      const active = seasonal.filter(
        (candidate) => candidate.startsAt <= orderedAt && (candidate.endsAt ?? endMs) >= orderedAt,
      )
      if (active.length > 0 && orderRandom.chance(rates.promotionUsageShare)) {
        promotion = orderRandom.pick(active)
      }
    }
    if (promotion && promotion.template.minOrderAmount !== null) {
      const minimum = toStoreCurrency(promotion.template.minOrderAmount * 100, currency)
      if (subtotalCents < minimum) {
        promotion = null
      }
    }
    let freeShipping = false
    if (promotion) {
      const template = promotion.template
      if (template.discountType === "percent") {
        for (const item of items) {
          item.discountCents = Math.round((item.lineCents * template.discountValue) / 100)
        }
      } else if (template.discountType === "fixed_amount") {
        let remaining = toStoreCurrency(template.discountValue * 100, currency)
        for (const item of items) {
          const share = Math.min(remaining, Math.round(item.lineCents * 0.5))
          item.discountCents = share
          remaining -= share
        }
      } else {
        freeShipping = true
      }
      for (const item of items) {
        item.lineCents -= item.discountCents
      }
    }
    const discountCents = items.reduce((sum, item) => sum + item.discountCents, 0)
    const serviceLevel = servicePicker.pick(orderRandom).value
    const fees = pool.shippingFees as Record<string, number>
    const threshold = toStoreCurrency(pool.freeShippingThreshold * 100, currency)
    const shippingCents =
      freeShipping || (serviceLevel === "standard" && subtotalCents - discountCents >= threshold)
        ? 0
        : toStoreCurrency(Math.round((fees[serviceLevel] ?? 0) * 100), currency)
    const vatRate = geography.country(customer.countryCode).vatRate
    const taxCents = Math.round((subtotalCents - discountCents) * vatRate)
    const order: Order = {
      id: 0,
      sequence: index,
      number: "",
      customer,
      addressId: customer.defaultAddressId,
      promotion,
      status: "delivered",
      channel: channelPicker.pick(orderRandom).value,
      currency,
      subtotalCents,
      discountCents,
      shippingCents,
      taxCents,
      totalCents: subtotalCents - discountCents + shippingCents + taxCents,
      orderedAt,
      items,
      deliveredAt: null,
    }
    customer.orderCount += 1
    orders.push(order)
    orderServiceLevel.set(order, serviceLevel)
  }
  orders.sort((left, right) => left.orderedAt - right.orderedAt || left.sequence - right.sequence)
  let itemId = 0
  orders.forEach((order, index) => {
    order.id = index + 1
    order.number = `${pool.orderNumberPrefix}-${yearOf(order.orderedAt)}-${padNumber(order.id * 3 + 100000, 7)}`
    for (const item of order.items) {
      itemId += 1
      item.id = itemId
    }
    order.customer.lastOrderAt = Math.max(order.customer.lastOrderAt ?? 0, order.orderedAt)
  })

  const fulfilmentRandom = context.random("fulfilment")
  const methodPicker = weightedPicker(pool.paymentMethods)
  const carrierPicker = weightedPicker(pool.carriers)
  const warehousePicker = weightedPicker(pool.warehouses)
  const reasonPicker = weightedPicker(pool.returnReasons)
  const payments: Payment[] = []
  const shipments: Shipment[] = []
  const returns: ReturnRecord[] = []
  const reference = () => `${pool.paymentReferencePrefix}${fulfilmentRandom.hex(16)}`
  for (const order of orders) {
    const method = methodPicker.pick(fulfilmentRandom).value
    const t = order.orderedAt
    if (fulfilmentRandom.chance(rates.failedPaymentAttemptShare)) {
      payments.push({
        order,
        method: fulfilmentRandom.chance(0.7) ? method : methodPicker.pick(fulfilmentRandom).value,
        reference: reference(),
        amountCents: order.totalCents,
        status: "failed",
        attemptedAt: Math.min(endMs, t + fulfilmentRandom.int(3, 30) * 1000),
        capturedAt: null,
      })
    }
    const attemptedAt = Math.min(endMs, t + fulfilmentRandom.int(35, 180) * 1000)
    let capturedAt: number
    if (method === "bank_transfer") {
      capturedAt = fulfilmentRandom.chance(rates.latePaymentShare * 8)
        ? attemptedAt + fulfilmentRandom.int(15, 45) * MS_PER_DAY
        : attemptedAt + fulfilmentRandom.int(20, 120) * MS_PER_HOUR
    } else if (fulfilmentRandom.chance(rates.latePaymentShare)) {
      capturedAt = attemptedAt + fulfilmentRandom.int(15, 40) * MS_PER_DAY
    } else {
      capturedAt = attemptedAt + fulfilmentRandom.int(1, 30) * MS_PER_MINUTE
    }
    const cancelled = fulfilmentRandom.chance(rates.cancellationShare)
    const payment: Payment = {
      order,
      method,
      reference: reference(),
      amountCents: order.totalCents,
      status: "captured",
      attemptedAt,
      capturedAt,
    }
    payments.push(payment)
    if (capturedAt > endMs) {
      payment.status = method === "bank_transfer" ? "pending" : "authorized"
      payment.capturedAt = null
      order.status = cancelled ? "cancelled" : "pending_payment"
      continue
    }
    if (cancelled) {
      payment.status = "refunded"
      order.status = "cancelled"
      continue
    }
    const serviceLevel = orderServiceLevel.get(order) ?? "standard"
    const domesticWarehouse = pool.warehouses.find(
      (candidate) => candidate.countryCode === order.customer.countryCode,
    )
    const warehouse =
      domesticWarehouse && fulfilmentRandom.chance(0.85)
        ? domesticWarehouse.code
        : warehousePicker.pick(fulfilmentRandom).code
    const carrier = carrierPicker.pick(fulfilmentRandom)
    const createdAt = capturedAt + fulfilmentRandom.int(2, 20) * MS_PER_HOUR
    if (createdAt > endMs) {
      order.status = "paid"
      continue
    }
    const shippedAt = createdAt + fulfilmentRandom.int(4, 40) * MS_PER_HOUR
    const transitDays =
      serviceLevel === "next_day"
        ? 1
        : serviceLevel === "express"
          ? fulfilmentRandom.int(1, 2)
          : fulfilmentRandom.int(2, 6)
    const deliveredAt =
      shippedAt + transitDays * MS_PER_DAY + fulfilmentRandom.int(-6, 6) * MS_PER_HOUR
    const shipment: Shipment = {
      order,
      warehouse,
      carrier: carrier.name,
      serviceLevel,
      tracking: `${carrier.trackingPrefix}${fulfilmentRandom.digits(10)}`,
      status: "delivered",
      createdAt,
      shippedAt,
      deliveredAt,
    }
    shipments.push(shipment)
    if (shippedAt > endMs) {
      shipment.status = "label_created"
      shipment.shippedAt = null
      shipment.deliveredAt = null
      order.status = "paid"
      continue
    }
    if (fulfilmentRandom.chance(rates.lostShipmentShare)) {
      shipment.status = "lost"
      shipment.deliveredAt = null
      order.status = "shipped"
      continue
    }
    if (deliveredAt > endMs) {
      shipment.status = "in_transit"
      shipment.deliveredAt = null
      order.status = "shipped"
      continue
    }
    order.status = "delivered"
    order.deliveredAt = deliveredAt
    if (fulfilmentRandom.chance(rates.missingShipDateShare)) {
      shipment.shippedAt = null
    }
    for (const item of order.items) {
      if (!fulfilmentRandom.chance(rates.returnShare)) {
        continue
      }
      const requestedAt =
        deliveredAt +
        fulfilmentRandom.int(1, 25) * MS_PER_DAY +
        fulfilmentRandom.int(0, 86399) * 1000
      if (requestedAt > endMs) {
        continue
      }
      const overQuantity = fulfilmentRandom.chance(
        rates.returnOverQuantityShare / rates.returnShare,
      )
      const quantity = overQuantity ? item.quantity + 1 : fulfilmentRandom.int(1, item.quantity)
      const age = endMs - requestedAt
      let status = "refunded"
      let processedAt: number | null = requestedAt + fulfilmentRandom.int(4, 14) * MS_PER_DAY
      if (age < 5 * MS_PER_DAY) {
        status = "requested"
        processedAt = null
      } else if (age < 12 * MS_PER_DAY && fulfilmentRandom.chance(0.6)) {
        status = "received"
        processedAt = null
      } else if (fulfilmentRandom.chance(0.06)) {
        status = "rejected"
      }
      if (processedAt !== null && processedAt > endMs) {
        status = "received"
        processedAt = null
      }
      const unitNet = Math.round(item.lineCents / item.quantity)
      returns.push({
        sequence: returns.length,
        order,
        item,
        quantity,
        reason: reasonPicker.pick(fulfilmentRandom).value,
        status,
        refundCents: status === "refunded" ? unitNet * quantity : null,
        requestedAt,
        processedAt,
      })
      if (status === "refunded") {
        item.returnedQuantity += quantity
      }
    }
    if (order.items.every((item) => item.returnedQuantity >= item.quantity)) {
      order.status = "returned"
    }
  }
  returns.sort(
    (left, right) => left.requestedAt - right.requestedAt || left.sequence - right.sequence,
  )
  payments.sort(
    (left, right) => left.attemptedAt - right.attemptedAt || left.order.id - right.order.id,
  )
  shipments.sort(
    (left, right) => left.createdAt - right.createdAt || left.order.id - right.order.id,
  )

  const tierThresholds = [...pool.loyaltyTiers].sort(
    (left, right) => right.minOrders - left.minOrders,
  )
  const loginRandom = context.random("logins")
  const lastLogins = new Map<Customer, number | null>()
  for (const customer of customers) {
    const base = customer.lastOrderAt ?? customer.createdAt
    lastLogins.set(
      customer,
      loginRandom.chance(0.06)
        ? null
        : Math.min(endMs, base + Math.floor(loginRandom.exponential(12 * MS_PER_DAY))),
    )
  }

  const inventoryRandom = context.random("inventory")
  const inventory = products.flatMap((product) =>
    pool.warehouses
      .filter(() => inventoryRandom.chance(rates.inventoryPresenceShare))
      .map((warehouse) => {
        const onHand = product.active
          ? inventoryRandom.int(0, Math.round(40 + product.popularity * 25))
          : 0
        return {
          product,
          warehouse: warehouse.code,
          onHand,
          reserved: Math.min(onHand, inventoryRandom.int(0, 12)),
          reorderPoint: inventoryRandom.int(10, 60),
          updatedAt: endMs - inventoryRandom.int(0, 72 * 60) * MS_PER_MINUTE,
        }
      }),
  )

  return [
    defineTable(
      "customers",
      [
        "customer_id",
        "email",
        "first_name",
        "last_name",
        "phone_number",
        "country_code",
        "city",
        "loyalty_tier",
        "marketing_opt_in",
        "created_at",
        "last_login_at",
      ],
      customers,
      (customer): Row => {
        const login = lastLogins.get(customer) ?? null
        return [
          customer.id,
          customer.email,
          customer.name.first,
          customer.name.last,
          customer.phone,
          customer.countryCode,
          customer.city,
          tierThresholds.find((tier) => customer.orderCount >= tier.minOrders)?.value ?? "none",
          customer.optIn,
          formatTimestamp(customer.createdAt),
          login === null ? null : formatTimestamp(login),
        ]
      },
    ),
    defineTable(
      "addresses",
      [
        "address_id",
        "customer_id",
        "address_type",
        "street_line",
        "city",
        "postal_code",
        "country_code",
        "is_default",
        "created_at",
      ],
      addresses,
      (address): Row => [
        address.id,
        address.customer.id,
        address.type,
        address.street,
        address.city,
        address.postalCode,
        address.countryCode,
        address.isDefault,
        formatTimestamp(address.createdAt),
      ],
    ),
    defineTable(
      "categories",
      ["category_id", "parent_category_id", "category_name", "slug"],
      categories,
      (category): Row => [category.id, category.parentId, category.name, category.slug],
    ),
    defineTable(
      "products",
      [
        "product_id",
        "sku",
        "product_name",
        "category_id",
        "brand",
        "unit_price",
        "unit_cost",
        "currency",
        "weight_grams",
        "is_active",
        "launched_at",
      ],
      products,
      (product): Row => [
        product.id,
        product.sku,
        product.name,
        product.category.id,
        product.brand,
        money(product.priceCents),
        money(product.costCents),
        pool.defaultCurrency,
        product.weightGrams,
        product.active,
        formatTimestamp(product.launchedAt),
      ],
    ),
    defineTable(
      "inventory",
      [
        "product_id",
        "warehouse_code",
        "quantity_on_hand",
        "quantity_reserved",
        "reorder_point",
        "updated_at",
      ],
      inventory,
      (entry): Row => [
        entry.product.id,
        entry.warehouse,
        entry.onHand,
        entry.reserved,
        entry.reorderPoint,
        formatTimestamp(entry.updatedAt),
      ],
    ),
    defineTable(
      "promotions",
      [
        "promotion_id",
        "promo_code",
        "description",
        "discount_type",
        "discount_value",
        "min_order_amount",
        "starts_at",
        "ends_at",
      ],
      promotions,
      (promotion): Row => [
        promotion.id,
        promotion.code,
        promotion.template.description,
        promotion.template.discountType,
        money(toCents(promotion.template.discountValue)),
        promotion.template.minOrderAmount === null
          ? null
          : money(toCents(promotion.template.minOrderAmount)),
        formatTimestamp(promotion.startsAt),
        promotion.endsAt === null ? null : formatTimestamp(promotion.endsAt),
      ],
    ),
    defineTable(
      "orders",
      [
        "order_id",
        "order_number",
        "customer_id",
        "shipping_address_id",
        "promotion_id",
        "status",
        "sales_channel",
        "currency",
        "subtotal_amount",
        "discount_amount",
        "shipping_amount",
        "tax_amount",
        "total_amount",
        "ordered_at",
      ],
      orders,
      (order): Row => [
        order.id,
        order.number,
        order.customer.id,
        order.addressId === 0 ? null : order.addressId,
        order.promotion?.id ?? null,
        order.status,
        order.channel,
        order.currency,
        money(order.subtotalCents),
        money(order.discountCents),
        money(order.shippingCents),
        money(order.taxCents),
        money(order.totalCents),
        formatTimestamp(order.orderedAt),
      ],
    ),
    defineTable(
      "order_items",
      [
        "order_item_id",
        "order_id",
        "line_number",
        "product_id",
        "quantity",
        "unit_price",
        "discount_amount",
        "line_total",
      ],
      orders.flatMap((order) => order.items.map((item) => ({ order, item }))),
      ({ order, item }): Row => [
        item.id,
        order.id,
        item.lineNumber,
        item.product.id,
        item.quantity,
        money(item.unitCents),
        money(item.discountCents),
        money(item.lineCents),
      ],
    ),
    defineTable(
      "payments",
      [
        "payment_id",
        "order_id",
        "payment_method",
        "provider_reference",
        "amount",
        "currency",
        "status",
        "attempted_at",
        "captured_at",
      ],
      payments,
      (payment, index): Row => [
        index + 1,
        payment.order.id,
        payment.method,
        payment.reference,
        money(payment.amountCents),
        payment.order.currency,
        payment.status,
        formatTimestamp(payment.attemptedAt),
        payment.capturedAt === null ? null : formatTimestamp(payment.capturedAt),
      ],
    ),
    defineTable(
      "shipments",
      [
        "shipment_id",
        "order_id",
        "warehouse_code",
        "carrier",
        "service_level",
        "tracking_number",
        "status",
        "created_at",
        "shipped_at",
        "delivered_at",
      ],
      shipments,
      (shipment, index): Row => [
        index + 1,
        shipment.order.id,
        shipment.warehouse,
        shipment.carrier,
        shipment.serviceLevel,
        shipment.tracking,
        shipment.status,
        formatTimestamp(shipment.createdAt),
        shipment.shippedAt === null ? null : formatTimestamp(shipment.shippedAt),
        shipment.deliveredAt === null ? null : formatTimestamp(shipment.deliveredAt),
      ],
    ),
    defineTable(
      "returns",
      [
        "return_id",
        "order_id",
        "order_item_id",
        "quantity",
        "reason",
        "status",
        "refund_amount",
        "requested_at",
        "processed_at",
      ],
      returns,
      (record, index): Row => [
        index + 1,
        record.order.id,
        record.item.id,
        record.quantity,
        record.reason,
        record.status,
        record.refundCents === null ? null : money(record.refundCents),
        formatTimestamp(record.requestedAt),
        record.processedAt === null ? null : formatTimestamp(record.processedAt),
      ],
    ),
  ]
}
