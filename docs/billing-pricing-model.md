# Billing And Pricing Model (v1)

Date: February 10, 2026

## Recommended Price Points

| Plan | Monthly | Annual (15% off) | Included Seats | Included AI Minutes / Month |
|---|---:|---:|---:|---:|
| Starter | $79 | $806 | 1 | 300 |
| Pro Team | $249 | $2,540 | 5 | 900 |
| Agency Scale | $699 | $7,130 | 20 | 2,500 |

Add-ons:
- Additional seat: $39 per seat / month (Pro, Agency)
- Overage: $0.12 per AI minute over included usage

## Margin Model Assumptions

- Blended AI COGS: $0.08 per AI minute
- Payment processing target: embedded in gross margin buffer
- Support/tooling overhead: tracked separately below gross margin

## Unit Economics At Included Usage

Formula:
- `Included COGS = included_minutes * 0.08`
- `Gross Margin % = (plan_price - Included COGS) / plan_price`

| Plan | Revenue (Monthly) | Included COGS | Gross Profit | Gross Margin |
|---|---:|---:|---:|---:|
| Starter | $79 | $24 | $55 | 69.6% |
| Pro Team | $249 | $72 | $177 | 71.1% |
| Agency Scale | $699 | $200 | $499 | 71.4% |

Overage economics:
- Revenue per overage minute: $0.12
- COGS per overage minute: $0.08
- Gross margin on overage: 33.3%

## Stripe Price IDs Used By App

Set these environment variables:
- `STRIPE_PRICE_STARTER_MONTHLY_ID`
- `STRIPE_PRICE_STARTER_ANNUAL_ID`
- `STRIPE_PRICE_PRO_MONTHLY_ID`
- `STRIPE_PRICE_PRO_ANNUAL_ID`
- `STRIPE_PRICE_AGENCY_MONTHLY_ID`
- `STRIPE_PRICE_AGENCY_ANNUAL_ID`

## Operational Notes

- Default plan is `pro` monthly when no selection is passed.
- Checkout metadata stores `planId` and `interval`.
- Next iteration should enforce included minutes + overage invoicing from usage logs.
