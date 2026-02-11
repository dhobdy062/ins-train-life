import Stripe from "stripe";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY is missing in .env.local");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia" as any, // Using a stable version instead of beta
});

const PLANS = [
  {
    id: "starter",
    name: "Non Dairy-Starter",
    tagline: "1 seat, 300 minutes/month",
    monthlyCents: 7900,
    annualCents: 80600,
    metadata: {
      included_minutes: "300",
      included_seats: "1",
    },
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_STARTER_MONTHLY_ID",
      annual: "STRIPE_PRICE_STARTER_ANNUAL_ID",
    },
  },
  {
    id: "pro",
    name: "Half and Half-Pro Team",
    tagline: "Up to 5 seats, 900 minutes/month",
    monthlyCents: 24900,
    annualCents: 254000,
    metadata: {
      included_minutes: "900",
      included_seats: "5",
    },
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_ID",
      annual: "STRIPE_PRICE_PRO_ANNUAL_ID",
    },
  },
  {
    id: "agency",
    name: "Sweet Cream-Agency Scale",
    tagline: "Up to 20 seats, 2500 minutes/month",
    monthlyCents: 69900,
    annualCents: 713000,
    metadata: {
      included_minutes: "2500",
      included_seats: "20",
    },
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_AGENCY_MONTHLY_ID",
      annual: "STRIPE_PRICE_AGENCY_ANNUAL_ID",
    },
  },
];

async function setup() {
  console.log("🚀 Starting Stripe setup...");
  const results: Record<string, string> = {};

  for (const plan of PLANS) {
    console.log(`\n📦 Creating product: ${plan.name}...`);
    
    // Create or find product
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.tagline,
      metadata: {
        planId: plan.id,
        ...plan.metadata
      },
    });

    console.log(`✅ Product created: ${product.id}`);

    // Create Monthly Price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthlyCents,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: `${plan.name} Monthly`,
      metadata: { planId: plan.id, interval: "monthly" },
    });
    results[plan.stripePriceEnv.monthly] = monthlyPrice.id;
    console.log(`💰 Monthly price created: ${monthlyPrice.id}`);

    // Create Annual Price
    const annualPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.annualCents,
      currency: "usd",
      recurring: { interval: "year" },
      nickname: `${plan.name} Annual`,
      metadata: { planId: plan.id, interval: "annual" },
    });
    results[plan.stripePriceEnv.annual] = annualPrice.id;
    console.log(`💰 Annual price created: ${annualPrice.id}`);
  }

  console.log("\n✨ Stripe setup complete!");
  console.log("\nCopy these lines into your .env.local:\n");
  for (const [key, value] of Object.entries(results)) {
    console.log(`${key}=${value}`);
  }
}

setup().catch((err) => {
  console.error("❌ Setup failed:", err);
  process.exit(1);
});
