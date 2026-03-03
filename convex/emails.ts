// convex/emails.ts
// Complete email actions for Cream No Sugar using Resend

import { action } from "./_generated/server";
import { v } from "convex/values";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "cream@support.retrospxt.com";
const BASE_URL = "https://cream.retrospxt.com";

// ============================================================================
// HELPER FUNCTION: Send Email via Resend
// ============================================================================

async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string
): Promise<{ id: string; success: boolean }> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to send email: ${error.message}`);
  }

  const data = (await response.json()) as any;
  return { id: data.id, success: true };
}

// ============================================================================
// EMAIL 1: Send Trainer Welcome Email
// ============================================================================
// Triggered when: Trainer creates their account
// Recipient: The new trainer
// Purpose: Welcome them to Cream No Sugar

export const sendTrainerWelcomeEmail = action({
  args: {
    trainerEmail: v.string(),
    trainerName: v.string(),
    orgName: v.string(),
  },
  handler: async (ctx, args) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #3E2723;
      background: #FAFAF8;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header {
      background: linear-gradient(135deg, #8B4513 0%, #6B3410 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 8px 0 0 0;
      opacity: 0.9;
    }
    .content {
      margin: 30px 0;
    }
    .content h2 {
      color: #8B4513;
      font-size: 20px;
      margin-top: 0;
    }
    .content p {
      margin: 12px 0;
    }
    .btn {
      display: inline-block;
      background: #8B4513;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
      transition: background 0.3s;
    }
    .btn:hover {
      background: #6B3410;
    }
    .features {
      background: #FFF8DC;
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid #8B4513;
      margin: 20px 0;
    }
    .features ul {
      margin: 0;
      padding-left: 20px;
    }
    .features li {
      margin: 8px 0;
    }
    .footer {
      text-align: center;
      color: #999;
      font-size: 12px;
      margin-top: 30px;
      border-top: 1px solid #E0E0E0;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>☕ Cream No Sugar</h1>
      <p>Welcome to Your AI Sales Coach</p>
    </div>

    <div class="content">
      <h2>Welcome, ${args.trainerName}!</h2>
      <p>You're about to transform how ${args.orgName} trains its sales team.</p>

      <p>With Cream No Sugar, your agents get:</p>
      <div class="features">
        <ul>
          <li><strong>Real AI prospects</strong> - No more fake role-plays</li>
          <li><strong>Instant feedback</strong> - Every call scored 0-100</li>
          <li><strong>Gamified progression</strong> - 5 difficulty levels, 7 objection types</li>
          <li><strong>Team leaderboards</strong> - Friendly competition</li>
          <li><strong>Coaching dashboard</strong> - See exactly what each agent needs</li>
          <li><strong>Social sharing</strong> - Badges they'll want to share</li>
        </ul>
      </div>

      <p><strong>Here's what you can do right now:</strong></p>
      <ol>
        <li>Invite your first agent to the platform</li>
        <li>Have them complete 3 practice calls</li>
        <li>Watch their close rate improve</li>
      </ol>

      <p style="text-align: center;">
        <a href="${BASE_URL}/dashboard" class="btn">Go to Dashboard</a>
      </p>

      <p>Questions? Check out our <a href="${BASE_URL}/FAQ_Page.html">FAQ</a> or reply to this email.</p>

      <p style="margin-top: 30px;">Let's build better salespeople together.</p>
      <p style="margin: 0; color: #8B4513; font-weight: 600;">The Cream No Sugar Team</p>
    </div>

    <div class="footer">
      <p>© 2026 Cream No Sugar. All rights reserved.</p>
      <p><a href="${BASE_URL}">Visit our website</a></p>
    </div>
  </div>
</body>
</html>
    `;

    const result = await sendEmailViaResend(
      args.trainerEmail,
      "Welcome to Cream No Sugar – Your AI Sales Coach",
      html
    );

    return {
      success: true,
      emailId: result.id,
      recipient: args.trainerEmail,
      timestamp: new Date().toISOString(),
    };
  },
});

// ============================================================================
// EMAIL 2: Send Trainee Invitation Email
// ============================================================================
// Triggered when: Trainer adds a trainee to their team
// Recipient: The new trainee
// Purpose: Invite them to start training

export const sendTraineeInvitationEmail = action({
  args: {
    traineeId: v.id("trainees"),
    traineeEmail: v.string(),
    traineeName: v.string(),
    trainerName: v.string(),
    uniqueDeviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const trainingLink = `${BASE_URL}/train?device_id=${args.uniqueDeviceId}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #3E2723;
      background: #FAFAF8;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header {
      background: linear-gradient(135deg, #8B4513 0%, #6B3410 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      margin: 30px 0;
    }
    .content h2 {
      color: #8B4513;
      font-size: 20px;
      margin-top: 0;
    }
    .btn-primary {
      display: inline-block;
      background: #4CAF50;
      color: white;
      padding: 14px 28px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
      font-size: 16px;
      transition: background 0.3s;
    }
    .btn-primary:hover {
      background: #45a049;
    }
    .info-box {
      background: #FFF8DC;
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid #8B4513;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #999;
      font-size: 12px;
      margin-top: 30px;
      border-top: 1px solid #E0E0E0;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>☕ Cream No Sugar</h1>
      <p>Your New AI Sales Coach</p>
    </div>

    <div class="content">
      <h2>You're In, ${args.traineeName}!</h2>
      <p><strong>${args.trainerName}</strong> just set you up with Cream No Sugar.</p>

      <p>This is not your typical sales training. No seminars. No role-plays. Just you vs. an AI prospect who won't go easy on you.</p>

      <div class="info-box">
        <p><strong>What you get:</strong></p>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Real objections from real prospects</li>
          <li>Instant feedback on every call (0-100 score)</li>
          <li>5 difficulty levels to progress through</li>
          <li>Badges to earn and share</li>
          <li>Your performance tracked on the leaderboard</li>
        </ul>
      </div>

      <p style="text-align: center;">
        <a href="${trainingLink}" class="btn-primary">Start Your First Call</a>
      </p>

      <p><strong>How it works:</strong></p>
      <ol>
        <li>Click the button above to start your first training call</li>
        <li>You'll hear an objection from an AI prospect</li>
        <li>Respond like you would on a real call (30 seconds)</li>
        <li>Get instant feedback and a score</li>
        <li>Do it again. Get better. Earn badges.</li>
      </ol>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        <strong>Pro tip:</strong> Do 10 practice calls this week and watch your confidence skyrocket. Your real close rate will thank you.
      </p>

      <p style="margin: 30px 0 0 0;">Let's go.</p>
      <p style="margin: 0; color: #8B4513; font-weight: 600;">The Cream No Sugar Team</p>
    </div>

    <div class="footer">
      <p>© 2026 Cream No Sugar. All rights reserved.</p>
      <p><a href="${BASE_URL}">Visit our website</a></p>
    </div>
  </div>
</body>
</html>
    `;

    const result = await sendEmailViaResend(
      args.traineeEmail,
      `${args.trainerName} Invited You to Cream No Sugar`,
      html
    );

    return {
      success: true,
      emailId: result.id,
      traineeId: args.traineeId,
      recipient: args.traineeEmail,
      timestamp: new Date().toISOString(),
    };
  },
});

// ============================================================================
// EMAIL 3: Send Feedback Request Email
// ============================================================================
// Triggered when: Trainer wants trainee to complete feedback survey
// Recipient: The trainee
// Purpose: Request feedback on their training experience

export const sendFeedbackRequestEmail = action({
  args: {
    traineeEmail: v.string(),
    traineeName: v.string(),
    trainerName: v.string(),
    surveyUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #3E2723;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header {
      background: #8B4513;
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-block;
      background: #8B4513;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Quick Feedback</h1>
    </div>

    <div style="margin: 30px 0;">
      <p>Hi ${args.traineeName},</p>

      <p>${args.trainerName} wants to know how your training is going.</p>

      <p>Take 2 minutes to share your feedback:</p>

      <p style="text-align: center;">
        <a href="${args.surveyUrl}" class="btn">Share Feedback</a>
      </p>

      <p>Your input helps us make Cream No Sugar better for you.</p>

      <p>Thanks!</p>
    </div>
  </div>
</body>
</html>
    `;

    const result = await sendEmailViaResend(
      args.traineeEmail,
      `${args.trainerName} wants your feedback`,
      html
    );

    return {
      success: true,
      emailId: result.id,
      recipient: args.traineeEmail,
      timestamp: new Date().toISOString(),
    };
  },
});

// ============================================================================
// EMAIL 4: Send Session Summary Email
// ============================================================================
// Triggered when: Trainee completes a training call
// Recipient: The trainee (optional, can be daily digest)
// Purpose: Motivate with results and next steps

export const sendSessionSummaryEmail = action({
  args: {
    traineeEmail: v.string(),
    traineeName: v.string(),
    callScore: v.number(),
    callDifficulty: v.string(),
    objectionHandled: v.string(),
    avgScore: v.number(),
    badgesEarned: v.array(v.string()),
    nextGoal: v.string(),
  },
  handler: async (ctx, args) => {
    const badgeEmojis: Record<string, string> = {
      credibility_master: "🎯",
      perfect_week: "⭐",
      on_fire: "🔥",
      appointment_setter: "📅",
      d3_unlocked: "🏅",
      speed_demon: "⚡",
    };

    const badgesHtml = args.badgesEarned
      .map(
        (badge) =>
          `<div style="display: inline-block; background: #FFF8DC; padding: 8px 16px; border-radius: 4px; margin: 4px; border-left: 3px solid #8B4513;">
        ${badgeEmojis[badge] || "🎖️"} ${badge.replace(/_/g, " ").toUpperCase()}
      </div>`
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #3E2723;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: white;
      border-radius: 8px;
    }
    .score-display {
      font-size: 48px;
      font-weight: 700;
      color: #8B4513;
      text-align: center;
      margin: 20px 0;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      border-bottom: 1px solid #E0E0E0;
    }
    .btn {
      display: inline-block;
      background: #8B4513;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2 style="color: #8B4513;">Great work, ${args.traineeName}!</h2>

    <div class="score-display">${args.callScore}%</div>

    <div style="background: #FFF8DC; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <div class="stat-row">
        <span><strong>Level:</strong></span>
        <span>${args.callDifficulty}</span>
      </div>
      <div class="stat-row">
        <span><strong>Objection:</strong></span>
        <span>${args.objectionHandled}</span>
      </div>
      <div class="stat-row">
        <span><strong>Your Average:</strong></span>
        <span>${args.avgScore}%</span>
      </div>
    </div>

    ${
      args.badgesEarned.length > 0
        ? `
    <p><strong>🎖️ You earned badges!</strong></p>
    <div style="margin: 12px 0;">
      ${badgesHtml}
    </div>
    `
        : ""
    }

    <p><strong>📈 Next Goal:</strong> ${args.nextGoal}</p>

    <p style="text-align: center;">
      <a href="${BASE_URL}/dashboard" class="btn">View Your Dashboard</a>
    </p>

    <p>Keep it up!</p>
  </div>
</body>
</html>
    `;

    const result = await sendEmailViaResend(
      args.traineeEmail,
      `Great Session! You scored ${args.callScore}%`,
      html
    );

    return {
      success: true,
      emailId: result.id,
      recipient: args.traineeEmail,
      timestamp: new Date().toISOString(),
    };
  },
});

// ============================================================================
// EMAIL 5: Send Trial Expiration Warning Email
// ============================================================================
// Triggered when: Trainer's trial is 24 hours from expiration
// Recipient: The trainer
// Purpose: Remind them to upgrade before losing access

export const sendTrialExpirationWarningEmail = action({
  args: {
    trainerEmail: v.string(),
    trainerName: v.string(),
    orgName: v.string(),
    expirationDate: v.string(),
  },
  handler: async (ctx, args) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #3E2723;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: white;
      border-radius: 8px;
    }
    .warning {
      background: #FFA500;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background: #8B4513;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2 style="color: #8B4513;">Your Trial Expires Tomorrow!</h2>

    <div class="warning">
      <h3 style="margin: 0;">⏰ ${args.expirationDate}</h3>
      <p style="margin: 8px 0 0 0;">You have 24 hours to continue training</p>
    </div>

    <p>Hi ${args.trainerName},</p>

    <p>Your ${args.orgName} trial expires tomorrow. To keep training your team, upgrade to a paid plan:</p>

    <ul>
      <li><strong>Starter:</strong> $79/month (1 seat, 300 min)</li>
      <li><strong>Pro:</strong> $249/month (5 seats, 900 min)</li>
      <li><strong>Agency:</strong> $699/month (20 seats, 2500 min)</li>
    </ul>

    <p style="text-align: center;">
      <a href="${BASE_URL}/checkout" class="btn">Upgrade Now</a>
    </p>

    <p>If you have questions, reply to this email or contact support.</p>

    <p>Let's keep your team sharp!</p>
  </div>
</body>
</html>
    `;

    const result = await sendEmailViaResend(
      args.trainerEmail,
      "Your Cream No Sugar trial expires tomorrow!",
      html
    );

    return {
      success: true,
      emailId: result.id,
      recipient: args.trainerEmail,
      timestamp: new Date().toISOString(),
    };
  },
});

// ============================================================================
// EMAIL 6: Send Weekly Trainer Report Email
// ============================================================================
// Triggered when: Weekly CRON job runs (Mondays at 9am)
// Recipient: The trainer
// Purpose: Show team progress and motivate action

export const sendWeeklyTrainerReportEmail = action({
  args: {
    trainerEmail: v.string(),
    trainerName: v.string(),
    orgName: v.string(),
    weekStartDate: v.string(),
    teamSize: v.number(),
    totalCallsThisWeek: v.number(),
    avgTeamScore: v.number(),
    topPerformer: v.string(),
    topPerformerScore: v.number(),
    badgesEarned: v.number(),
    needsAttention: v.array(
      v.object({
        name: v.string(),
        score: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const needsAttentionHtml = args.needsAttention
      .map(
        (agent) =>
          `<tr style="border-bottom: 1px solid #E0E0E0;">
        <td style="padding: 12px;">${agent.name}</td>
        <td style="padding: 12px;">${agent.score}%</td>
      </tr>`
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #3E2723;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: white;
      border-radius: 8px;
    }
    .header {
      background: #8B4513;
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    .stat-box {
      display: inline-block;
      background: #FFF8DC;
      padding: 20px;
      border-radius: 8px;
      margin: 10px;
      text-align: center;
      border-left: 4px solid #8B4513;
      flex: 1;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #8B4513;
    }
    .stat-label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .btn {
      display: inline-block;
      background: #8B4513;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: #F5F5F5;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #E0E0E0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">📊 Weekly Report</h2>
      <p style="margin: 8px 0 0 0;">Week of ${args.weekStartDate}</p>
    </div>

    <p>Hi ${args.trainerName},</p>

    <p>Here's how ${args.orgName} performed this week:</p>

    <div style="display: flex; flex-wrap: wrap; justify-content: center;">
      <div class="stat-box">
        <div class="stat-value">${args.totalCallsThisWeek}</div>
        <div class="stat-label">Total Calls</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${args.avgTeamScore}%</div>
        <div class="stat-label">Avg Score</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${args.badgesEarned}</div>
        <div class="stat-label">Badges Earned</div>
      </div>
    </div>

    <h3 style="color: #8B4513; margin-top: 30px;">🏆 Top Performer</h3>
    <p><strong>${args.topPerformer}</strong> led the team with ${args.topPerformerScore}% average. Great work!</p>

    ${
      args.needsAttention.length > 0
        ? `
    <h3 style="color: #8B4513;">⚠️ Needs Attention</h3>
    <p>These agents could use some coaching this week:</p>
    <table>
      <thead>
        <tr>
          <th>Agent</th>
          <th>Current Avg</th>
        </tr>
      </thead>
      <tbody>
        ${needsAttentionHtml}
      </tbody>
    </table>
    <p>Send them some feedback or jump on a 1-on-1 call.</p>
    `
        : ""
    }

    <p style="text-align: center;">
      <a href="${BASE_URL}/dashboard" class="btn">View Full Dashboard</a>
    </p>

    <p>Keep pushing your team. They're doing great!</p>

    <p style="color: #8B4513; font-weight: 600;">The Cream No Sugar Team</p>
  </div>
</body>
</html>
    `;

    const result = await sendEmailViaResend(
      args.trainerEmail,
      `${args.orgName} Weekly Report - ${args.weekStartDate}`,
      html
    );

    return {
      success: true,
      emailId: result.id,
      recipient: args.trainerEmail,
      timestamp: new Date().toISOString(),
    };
  },
});

// ============================================================================
// EXPORT ALL EMAIL ACTIONS
// ============================================================================

export default {
  sendTrainerWelcomeEmail,
  sendTraineeInvitationEmail,
  sendFeedbackRequestEmail,
  sendSessionSummaryEmail,
  sendTrialExpirationWarningEmail,
  sendWeeklyTrainerReportEmail,
};
