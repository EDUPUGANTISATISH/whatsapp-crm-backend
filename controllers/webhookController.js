import {
  db,
  FieldValue,
  Timestamp,
} from "../config/firebaseAdmin.js";

/**
 * Meta uses this GET endpoint to verify the webhook.
 */
export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const receivedToken = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const expectedToken =
    process.env.WEBHOOK_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    receivedToken &&
    receivedToken === expectedToken
  ) {
    console.log(
      "WhatsApp webhook verification successful."
    );

    return res.status(200).send(challenge);
  }

  console.error(
    "WhatsApp webhook verification failed."
  );

  return res.status(403).json({
    success: false,
    message: "Webhook verification failed.",
  });
};

/**
 * Meta uses this POST endpoint for:
 * 1. Incoming customer messages
 * 2. sent / delivered / read / failed status events
 */
export const receiveWebhook = async (req, res) => {
  // Meta expects a quick 200 response.
  res.sendStatus(200);

  try {
    const body = req.body;

    if (
      body?.object !==
      "whatsapp_business_account"
    ) {
      console.log(
        "Ignored non-WhatsApp webhook."
      );
      return;
    }

    const entries = Array.isArray(body.entry)
      ? body.entry
      : [];

    for (const entry of entries) {
      const changes = Array.isArray(
        entry.changes
      )
        ? entry.changes
        : [];

      for (const change of changes) {
        const value = change?.value;

        if (!value) {
          continue;
        }

        const metadata = value.metadata || {};

        const contacts = Array.isArray(
          value.contacts
        )
          ? value.contacts
          : [];

        const incomingMessages =
          Array.isArray(value.messages)
            ? value.messages
            : [];

        const statuses = Array.isArray(
          value.statuses
        )
          ? value.statuses
          : [];

        /*
         * Save incoming customer messages.
         */
        for (const message of incomingMessages) {
          await saveIncomingMessage({
            message,
            contacts,
            metadata,
          });
        }

        /*
         * Update outgoing message status.
         */
        for (const statusData of statuses) {
          await updateMessageStatus(
            statusData
          );
        }
      }
    }
  } catch (error) {
    console.error(
      "Webhook processing error:",
      error
    );
  }
};

/**
 * Save incoming WhatsApp message.
 */
const saveIncomingMessage = async ({
  message,
  contacts,
  metadata,
}) => {
  const customerPhone = String(
    message?.from || ""
  ).trim();

  const customerProfile = contacts.find(
    (contact) =>
      String(contact?.wa_id || "") ===
      customerPhone
  );

  const customerName =
    customerProfile?.profile?.name ||
    "Unknown customer";

  const messageType =
    message?.type || "unknown";

  const messageText =
    extractMessageText(message);

  const whatsappMessageId =
    message?.id ||
    `${customerPhone}-${Date.now()}`;

  const messageReference = db
    .collection("messages")
    .doc(whatsappMessageId);

  const existingMessage =
    await messageReference.get();

  /*
   * Meta can retry the same webhook.
   * Prevent duplicate documents.
   */
  if (existingMessage.exists) {
    console.log(
      "Duplicate webhook ignored:",
      whatsappMessageId
    );
    return;
  }

  const timestampSeconds = Number(
    message?.timestamp
  );

  const whatsappCreatedAt =
    Number.isFinite(timestampSeconds)
      ? Timestamp.fromMillis(
        timestampSeconds * 1000
      )
      : FieldValue.serverTimestamp();

  const messageData = {
    whatsappMessageId,

    direction: "incoming",

    phone: customerPhone,

    customerName,

    message: messageText,

    type: messageType,

    status: "received",

    displayPhoneNumber:
      metadata?.display_phone_number || "",

    phoneNumberId:
      metadata?.phone_number_id || "",

    whatsappCreatedAt,

    createdAt:
      FieldValue.serverTimestamp(),

    updatedAt:
      FieldValue.serverTimestamp(),

    isRead: false,
  };

  await messageReference.set(
    messageData
  );

  console.log(
    "Incoming WhatsApp message saved:",
    {
      whatsappMessageId,
      phone: maskPhone(customerPhone),
      type: messageType,
      message: messageText,
    }
  );
};

/**
 * Update outgoing message status:
 * sent → delivered → read
 * or sent → failed
 */
const updateMessageStatus = async (
  statusData
) => {
  const whatsappMessageId = String(
    statusData?.id || ""
  ).trim();

  const newStatus = String(
    statusData?.status || "unknown"
  ).trim();

  if (!whatsappMessageId) {
    console.warn(
      "Status webhook received without message ID."
    );
    return;
  }

  console.log(
    "WhatsApp message status received:",
    {
      whatsappMessageId,
      status: newStatus,
      recipientId:
        statusData?.recipient_id || "",
      errors: statusData?.errors || [],
    }
  );

  const updateData = {
    status: newStatus,

    updatedAt:
      FieldValue.serverTimestamp(),
  };

  /*
   * Store Meta status timestamp.
   */
  const timestampSeconds = Number(
    statusData?.timestamp
  );

  if (
    Number.isFinite(timestampSeconds)
  ) {
    updateData.statusUpdatedAt =
      Timestamp.fromMillis(
        timestampSeconds * 1000
      );
  }

  /*
   * Store recipient ID.
   */
  if (statusData?.recipient_id) {
    updateData.recipientId = String(
      statusData.recipient_id
    );
  }

  /*
   * Store failed delivery error details.
   */
  if (
    Array.isArray(statusData?.errors) &&
    statusData.errors.length > 0
  ) {
    updateData.deliveryErrors =
      statusData.errors;
  }

  /*
   * First try:
   * outgoing documents use whatsappMessageId
   * as the Firestore document ID.
   */
  const directReference = db
    .collection("messages")
    .doc(whatsappMessageId);

  const directSnapshot =
    await directReference.get();

  if (directSnapshot.exists) {
    await directReference.update(
      updateData
    );

    console.log(
      "WhatsApp message status updated:",
      {
        whatsappMessageId,
        status: newStatus,
        method: "document-id",
      }
    );

    return;
  }

  /*
   * Fallback:
   * for older documents whose document ID
   * is different.
   */
  const matchingMessages = await db
    .collection("messages")
    .where(
      "whatsappMessageId",
      "==",
      whatsappMessageId
    )
    .limit(1)
    .get();

  if (matchingMessages.empty) {
    console.warn(
      "Status message document not found:",
      {
        whatsappMessageId,
        status: newStatus,
      }
    );

    return;
  }

  await matchingMessages.docs[0].ref.update(
    updateData
  );

  console.log(
    "WhatsApp message status updated:",
    {
      whatsappMessageId,
      status: newStatus,
      method: "field-query",
    }
  );
};

/**
 * Convert different WhatsApp message types
 * into readable text.
 */
const extractMessageText = (
  message
) => {
  switch (message?.type) {
    case "text":
      return (
        message?.text?.body || ""
      );

    case "button":
      return (
        message?.button?.text || ""
      );

    case "interactive":
      return (
        message?.interactive
          ?.button_reply?.title ||
        message?.interactive
          ?.list_reply?.title ||
        "Interactive reply"
      );

    case "image":
      return (
        message?.image?.caption ||
        "Image received"
      );

    case "video":
      return (
        message?.video?.caption ||
        "Video received"
      );

    case "document":
      return (
        message?.document?.filename ||
        "Document received"
      );

    case "audio":
      return "Audio received";

    case "sticker":
      return "Sticker received";

    case "location":
      return "Location received";

    case "contacts":
      return "Contact received";

    default:
      return `${message?.type || "Unknown"
        } message received`;
  }
};

/**
 * Hide most digits in logs.
 */
const maskPhone = (phone = "") => {
  const normalizedPhone =
    String(phone);

  if (normalizedPhone.length < 7) {
    return "****";
  }

  return `${normalizedPhone.slice(
    0,
    4
  )}****${normalizedPhone.slice(-3)}`;
};
