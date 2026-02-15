import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function decodeBase64(input: string) {
  const normalized = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function getSessionByKey(ctx: any, sessionKey: string) {
  return ctx.db
    .query("trainingSessions")
    .withIndex("by_sessionKey", (q: any) => q.eq("sessionKey", sessionKey))
    .first();
}

function canAccessSession(session: { trainerId: string; orgId: string }, orgId: string, userId: string) {
  return session.trainerId === userId || session.orgId === orgId;
}

export const storeSessionRecording = mutation({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    userId: v.string(),
    recordingBuffer: v.string(),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionByKey(ctx, args.sessionKey);
    if (!session) {
      throw new Error("Session not found");
    }

    if (!canAccessSession(session, args.orgId, args.userId)) {
      throw new Error("Unauthorized");
    }

    const bytes = decodeBase64(args.recordingBuffer);
    const contentType = args.mimeType && args.mimeType.length > 0 ? args.mimeType : "audio/wav";
    const storageId = await ctx.storage.store(new Blob([bytes], { type: contentType }));

    await ctx.db.patch(session._id, {
      recordingStorageId: storageId,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      sessionKey: args.sessionKey,
      storageId,
    };
  },
});

export const storeTranscript = mutation({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    userId: v.string(),
    transcriptText: v.string(),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await getSessionByKey(ctx, args.sessionKey);
    if (!session) {
      throw new Error("Session not found");
    }

    if (!canAccessSession(session, args.orgId, args.userId)) {
      throw new Error("Unauthorized");
    }

    const contentType = args.mimeType && args.mimeType.length > 0 ? args.mimeType : "text/plain";
    const storageId = await ctx.storage.store(new Blob([args.transcriptText], { type: contentType }));

    await ctx.db.patch(session._id, {
      transcriptStorageId: storageId,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      sessionKey: args.sessionKey,
      storageId,
    };
  },
});

export const getRecordingUrl = query({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionByKey(ctx, args.sessionKey);
    if (!session) {
      throw new Error("Session not found");
    }

    if (!canAccessSession(session, args.orgId, args.userId)) {
      throw new Error("Unauthorized");
    }

    if (!session.recordingStorageId) {
      throw new Error("Recording not available");
    }

    const url = await ctx.storage.getUrl(session.recordingStorageId);
    return {
      url,
      fileName: `${session.sessionKey}.wav`,
      mimeType: "audio/wav",
    };
  },
});

export const getTranscriptUrl = query({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionByKey(ctx, args.sessionKey);
    if (!session) {
      throw new Error("Session not found");
    }

    if (!canAccessSession(session, args.orgId, args.userId)) {
      throw new Error("Unauthorized");
    }

    if (!session.transcriptStorageId) {
      throw new Error("Transcript not available");
    }

    const url = await ctx.storage.getUrl(session.transcriptStorageId);
    return {
      url,
      fileName: `${session.sessionKey}-transcript.txt`,
      mimeType: "text/plain",
    };
  },
});

export const getSessionWithFiles = query({
  args: {
    sessionKey: v.string(),
    orgId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await getSessionByKey(ctx, args.sessionKey);
    if (!session) {
      throw new Error("Session not found");
    }

    if (!canAccessSession(session, args.orgId, args.userId)) {
      throw new Error("Unauthorized");
    }

    const recordingUrl = session.recordingStorageId ? await ctx.storage.getUrl(session.recordingStorageId) : null;
    const transcriptUrl = session.transcriptStorageId ? await ctx.storage.getUrl(session.transcriptStorageId) : null;

    return {
      sessionKey: session.sessionKey,
      orgId: session.orgId,
      trainerId: session.trainerId,
      traineeId: session.traineeId ?? null,
      status: session.status,
      createdAt: session.createdAt,
      endedAt: session.endedAt ?? null,
      recordingStorageId: session.recordingStorageId ?? null,
      transcriptStorageId: session.transcriptStorageId ?? null,
      recordingUrl,
      transcriptUrl,
    };
  },
});
