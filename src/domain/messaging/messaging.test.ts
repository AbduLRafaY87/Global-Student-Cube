import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizeInboxChannel,
  authorizeRealtimeChannel,
  canDeliverToMember,
  canReadConversation,
  canSendMessage,
  conversationChannelName,
  financialAttachmentAllowed,
  leftoverPairKey,
  mapLeftoverMessage,
  parentMayJoinThread,
  rateLimitExceeded,
  searchHidesUnrelatedIdentity,
  shouldNotifyNewMessage,
  unreadCount,
  unansweredCounselorPreview,
  validateMessageBody,
} from "./messaging";

const CONVERSATION = "11111111-1111-4111-8111-111111111111";
const STUDENT = "22222222-2222-4222-8222-222222222222";
const COUNSELOR = "33333333-3333-4333-8333-333333333333";
const STRANGER = "44444444-4444-4444-8444-444444444444";

describe("realtime channel authorization", () => {
  it("denies an unauthorized account and does not leak the conversation channel payload", () => {
    const denied = authorizeRealtimeChannel({
      accountId: STRANGER,
      conversationId: CONVERSATION,
      memberAccountId: null,
      leftAt: null,
      relationshipValid: false,
      grantRevoked: false,
      blocked: false,
    });
    assert.equal(denied.authorized, false);
    assert.equal(denied.channel, conversationChannelName(CONVERSATION));

    const allowed = authorizeRealtimeChannel({
      accountId: STUDENT,
      conversationId: CONVERSATION,
      memberAccountId: STUDENT,
      leftAt: null,
      relationshipValid: true,
      grantRevoked: false,
      blocked: false,
    });
    assert.equal(allowed.authorized, true);
  });

  it("authorizes the inbox channel only for the requesting account", () => {
    const own = authorizeInboxChannel({ accountId: STUDENT, requesterId: STUDENT });
    assert.equal(own.authorized, true);
    assert.equal(own.channel, `inbox:${STUDENT}`);
    assert.equal(
      authorizeInboxChannel({ accountId: STUDENT, requesterId: STRANGER }).authorized,
      false,
    );
  });
});

describe("revoked grant stops delivery", () => {
  it("stops channel auth, read, send, and recipient delivery after the grant is revoked", () => {
    const revoked = {
      accountId: COUNSELOR,
      conversationId: CONVERSATION,
      memberAccountId: COUNSELOR,
      leftAt: null,
      relationshipValid: false,
      grantRevoked: true,
      blocked: false,
    };
    assert.equal(authorizeRealtimeChannel(revoked).authorized, false);
    assert.equal(
      canReadConversation({
        memberAccountId: COUNSELOR,
        leftAt: null,
        relationshipValid: false,
        grantRevoked: true,
      }),
      false,
    );
    assert.equal(
      canSendMessage({
        canRead: false,
        canSendFlag: true,
        closedAt: null,
        blocked: false,
        senderApproved: true,
      }),
      false,
    );
    assert.equal(
      canDeliverToMember({
        leftAt: null,
        grantRevoked: true,
        blocked: false,
        relationshipValid: false,
      }),
      false,
    );
  });

  it("stops delivery when membership is left even if the row still exists", () => {
    assert.equal(
      canDeliverToMember({
        leftAt: "2026-09-25T00:00:00.000Z",
        grantRevoked: false,
        blocked: false,
        relationshipValid: true,
      }),
      false,
    );
  });
});

describe("unread counts", () => {
  it("counts only incoming unremoved messages after last_read_at", () => {
    const messages = [
      {
        senderId: COUNSELOR,
        createdAt: "2026-09-24T10:00:00.000Z",
        removedAt: null,
      },
      {
        senderId: COUNSELOR,
        createdAt: "2026-09-24T12:00:00.000Z",
        removedAt: null,
      },
      {
        senderId: STUDENT,
        createdAt: "2026-09-24T13:00:00.000Z",
        removedAt: null,
      },
      {
        senderId: COUNSELOR,
        createdAt: "2026-09-24T14:00:00.000Z",
        removedAt: "2026-09-24T14:01:00.000Z",
      },
    ];
    assert.equal(unreadCount(messages, STUDENT, "2026-09-24T11:00:00.000Z"), 1);
    assert.equal(unreadCount(messages, STUDENT, null), 2);
    assert.equal(unreadCount(messages, COUNSELOR, null), 1);
  });
});

describe("leftover message migration mapping", () => {
  it("preserves leftover id, body, sender, counterpart, created_at, and read flag", () => {
    const leftover = {
      id: "55555555-5555-4555-8555-555555555555",
      sender_id: STUDENT,
      receiver_id: COUNSELOR,
      content: "Keep this leftover body",
      read: true,
      created_at: "2026-01-15T08:30:00.000Z",
    };
    const mapped = mapLeftoverMessage(leftover);
    assert.equal(mapped.id, leftover.id);
    assert.equal(mapped.senderId, leftover.sender_id);
    assert.equal(mapped.counterpartId, leftover.receiver_id);
    assert.equal(mapped.body, leftover.content);
    assert.equal(mapped.clientMessageId, leftover.id);
    assert.equal(mapped.createdAt, leftover.created_at);
    assert.equal(mapped.wasRead, true);
    assert.equal(leftoverPairKey(STUDENT, COUNSELOR), leftoverPairKey(COUNSELOR, STUDENT));
  });
});

describe("guardian and parent invite rules", () => {
  it("does not add a parent unless the thread invite is explicit", () => {
    assert.equal(
      parentMayJoinThread({
        invited: false,
        parentLinkActive: true,
        parentLinkKind: "verified_guardian",
        studentAgeYears: 16,
      }),
      false,
    );
  });

  it("requires a verified guardian for a minor and accepts an adult authorized parent for 18+", () => {
    assert.equal(
      parentMayJoinThread({
        invited: true,
        parentLinkActive: true,
        parentLinkKind: "adult_authorized",
        studentAgeYears: 16,
      }),
      false,
    );
    assert.equal(
      parentMayJoinThread({
        invited: true,
        parentLinkActive: true,
        parentLinkKind: "verified_guardian",
        studentAgeYears: 16,
      }),
      true,
    );
    assert.equal(
      parentMayJoinThread({
        invited: true,
        parentLinkActive: true,
        parentLinkKind: "adult_authorized",
        studentAgeYears: 19,
      }),
      true,
    );
  });
});

describe("limits, search leak, attachments, and notices", () => {
  it("rejects empty and over-long bodies and caps sends at 30 per minute", () => {
    assert.equal(validateMessageBody("   ", null).ok, false);
    assert.equal(validateMessageBody("ok", null).ok, true);
    assert.equal(validateMessageBody("x".repeat(4001), null).ok, false);
    assert.equal(validateMessageBody("", "file-1").ok, true);
    assert.equal(rateLimitExceeded(29), false);
    assert.equal(rateLimitExceeded(30), true);
  });

  it("hides unrelated GSC identity searches and requires finance scope for financial files", () => {
    assert.equal(searchHidesUnrelatedIdentity("GSC-000001", 0), true);
    assert.equal(searchHidesUnrelatedIdentity("GSC-000001", 1), false);
    assert.equal(searchHidesUnrelatedIdentity("ada", 0), false);
    assert.equal(
      financialAttachmentAllowed({ filePurpose: "financial_proof", hasFinanceScope: false }),
      false,
    );
    assert.equal(
      financialAttachmentAllowed({ filePurpose: "other", hasFinanceScope: false }),
      true,
    );
  });

  it("defaults new-message notices to in-app and honours an explicit email opt-in", () => {
    assert.deepEqual(shouldNotifyNewMessage(null), { inApp: true, email: false });
    assert.deepEqual(shouldNotifyNewMessage({ inApp: false, email: true }), {
      inApp: false,
      email: true,
    });
  });

  it("feeds the home unanswered-counselor-messages widget without inventing rows", () => {
    const empty = unansweredCounselorPreview([]);
    assert.equal(empty.empty, true);
    assert.equal(empty.emptyMessage, "No unanswered counselor messages.");
    const filled = unansweredCounselorPreview([
      {
        conversationId: CONVERSATION,
        preview: "Can we review the shortlist?",
        href: `/messages/${CONVERSATION}`,
      },
    ]);
    assert.equal(filled.empty, false);
    assert.equal(filled.items.length, 1);
  });
});
