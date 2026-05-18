import { createClerkClient } from '@clerk/nextjs/server';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function setupProUser() {
  const email = 'don+clerk_pro_user@retrospxt.com';
  let user = (await clerkClient.users.getUserList({ emailAddress: [email] }))[0];

  if (!user) {
    user = await clerkClient.users.createUser({
      emailAddress: [email],
      password: 'ComplexPassword123!',
    });
  }

  await clerkClient.users.updateUserMetadata(user.id, {
    publicMetadata: {
      stripePriceId: 'price_1SzieEDVH1F2PNJS1TtYaRCO', // From .env.local
      stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    },
  });

  return user;
}
