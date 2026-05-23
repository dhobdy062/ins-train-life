import { chromium, FullConfig } from '@playwright/test';
import { createClerkClient } from '@clerk/nextjs/server';

const clerkClient = createClerkClient({ secretKey: 'sk_test_wVAM53zGb23uixk9jUDqLnALeCPwvYrup2HiTh2g1I' });

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const email = 'don+clerk_test@retrospxt.com';
  const userList = await clerkClient.users.getUserList({ emailAddress: [email] });

  if (!userList.data || userList.data.length === 0) {
    throw new Error(`Test user with email ${email} not found. Please add it to your Clerk project.`);
  }

  const user = userList.data[0];
  const session = await clerkClient.sessions.createSession({ userId: user.id });

  process.env.E2E_TEST_SESSION = session.id;
}

export default globalSetup;
