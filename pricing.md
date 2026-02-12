# Pricing And Stripe Setup

## Plans

| Plan | Monthly Price | Annual Price (15% off) | Included Seats | Included Minutes / Month | Included Hours / Month |
|---|---:|---:|---:|---:|---:|
| Starter | $79 | $806 | 1 | 300 | 5.0 |
| Pro Team | $249 | $2,540 | 5 | 900 | 15.0 |
| Agency Scale | $699 | $7,130 | 20 | 2,500 | 41.7 |

## Usage Add-Ons

- Additional seat (Pro Team, Agency Scale): `$39/month` per seat
- Overage usage: `$0.12/minute` over included monthly minutes

## Stripe Price IDs To Create

Create six recurring prices in Stripe and map them to these env vars:

- `STRIPE_PRICE_STARTER_MONTHLY_ID` -> Starter monthly (`$79`)
- `STRIPE_PRICE_STARTER_ANNUAL_ID` -> Starter annual (`$806`)
- `STRIPE_PRICE_PRO_MONTHLY_ID` -> Pro Team monthly (`$249`)
- `STRIPE_PRICE_PRO_ANNUAL_ID` -> Pro Team annual (`$2,540`)
- `STRIPE_PRICE_AGENCY_MONTHLY_ID` -> Agency Scale monthly (`$699`)
- `STRIPE_PRICE_AGENCY_ANNUAL_ID` -> Agency Scale annual (`$7,130`)

## Stripe Recurring Cadence

- Monthly prices: `interval=month`
- Annual prices: `interval=year`

## Recommended Product Naming In Stripe

- Product: `InsureTrain Starter`
- Product: `InsureTrain Pro Team`
- Product: `InsureTrain Agency Scale`

For each product, create two recurring prices: monthly and annual.
