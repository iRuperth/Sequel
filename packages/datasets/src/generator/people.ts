import type { City, Country, GeographyPool, PeoplePool } from "../pools"
import { WeightedPicker, weightedPicker, type Random } from "../random"
import { slugify } from "./format"

export interface PersonName {
  first: string
  last: string
}

export class PeopleFactory {
  private readonly domainPicker: WeightedPicker<{ value: string; weight: number }>

  constructor(private readonly pool: PeoplePool) {
    this.domainPicker = weightedPicker(pool.emailDomains)
  }

  name(random: Random): PersonName {
    return { first: random.pick(this.pool.firstNames), last: random.pick(this.pool.lastNames) }
  }

  personalEmail(random: Random, name: PersonName): string {
    const first = slugify(name.first)
    const last = slugify(name.last)
    const style = random.int(0, 4)
    const suffix = random.chance(0.55) ? String(random.int(1, 99)) : ""
    const local =
      style === 0
        ? `${first}.${last}${suffix}`
        : style === 1
          ? `${first}${last}${suffix}`
          : style === 2
            ? `${first.charAt(0)}${last}${suffix}`
            : style === 3
              ? `${first}_${last}${suffix}`
              : `${last}.${first}${suffix}`
    return `${local}@${this.domainPicker.pick(random).value}`
  }

  workEmail(name: PersonName, domain: string, disambiguator: number): string {
    const base = `${slugify(name.first)}.${slugify(name.last)}`
    return disambiguator > 1 ? `${base}${disambiguator}@${domain}` : `${base}@${domain}`
  }
}

export class Geography {
  readonly countries: readonly Country[]
  private readonly countryByCode = new Map<string, Country>()
  private readonly cityPickers = new Map<string, WeightedPicker<City>>()
  private readonly residentPicker: WeightedPicker<Country>
  private readonly travelPicker: WeightedPicker<Country>
  private readonly onlineHubPicker: WeightedPicker<Country>

  constructor(readonly pool: GeographyPool) {
    this.countries = pool.countries
    for (const country of pool.countries) {
      this.countryByCode.set(country.code, country)
      const cities = pool.cities.filter((city) => city.countryCode === country.code)
      if (cities.length > 0) {
        this.cityPickers.set(country.code, weightedPicker(cities))
      }
    }
    this.residentPicker = new WeightedPicker(
      pool.countries,
      pool.countries.map((country) => country.residentWeight),
    )
    this.travelPicker = new WeightedPicker(
      pool.countries,
      pool.countries.map((country) => country.travelWeight),
    )
    this.onlineHubPicker = new WeightedPicker(
      pool.countries,
      pool.countries.map((country) => country.onlineHubWeight),
    )
  }

  country(code: string): Country {
    const country = this.countryByCode.get(code)
    if (!country) {
      throw new Error(`Unknown country ${code}`)
    }
    return country
  }

  residentCountry(random: Random): Country {
    return this.residentPicker.pick(random)
  }

  travelCountry(random: Random): Country {
    return this.travelPicker.pick(random)
  }

  onlineHubCountry(random: Random): Country {
    return this.onlineHubPicker.pick(random)
  }

  city(random: Random, countryCode: string): string {
    const picker = this.cityPickers.get(countryCode)
    if (!picker) {
      throw new Error(`No cities configured for ${countryCode}`)
    }
    return picker.pick(random).name
  }

  phoneNumber(random: Random, countryCode: string): string {
    const country = this.country(countryCode)
    return `${country.phonePrefix} ${random.int(1, 9)}${random.digits(2)} ${random.digits(7)}`
  }

  postalCode(random: Random, countryCode: string): string {
    const pattern = this.country(countryCode).postalPattern
    let output = ""
    for (const symbol of pattern) {
      if (symbol === "#") {
        output += random.digits(1)
      } else if (symbol === "@") {
        output += random.code(1).replace(/[0-9]/, "X")
      } else {
        output += symbol
      }
    }
    return output
  }

  streetLine(random: Random): string {
    return `${random.int(1, 240)} ${random.pick(this.pool.streetNames)}`
  }
}
