import {
  db,
  FieldValue,
  Timestamp,
} from "../config/firebaseAdmin.js";

/**
 * Meta calls this GET route when verifying the webhook.
 */
export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const receivedToken = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    receivedToken &&
    receivedToken === expectedToken
  ) {
    console.log("WhatsApp webhook verification successful.");
    return res.status(200).send(challenge);
  }

  console.error("WhatsApp webhook verification failed.");

  return res.status(403).json({
    success: false,
    message: "Webhook verification failed.",
  });
};

/**
 * Meta calls this POST route for incoming messages and message-status events.
 */
export const receiveWebhook = async (req, res) => {
  // Respond quickly so Meta knows the webhook was received.
  res.sendStatus(200);

  try {
    const body = req.body;

    if (body?.object !== "whatsapp_business_account") {
      console.log("Ignored non-WhatsApp webhook.");
      return;
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change?.value;

        if (!value) {
          continue;
        }

        const metadata = value.metadata ?? {};
        const contacts = Array.isArray(value.contacts) ? value.contacts : [];
        const incomingMessages = Array.isArray(value.messages)
          ? value.messages
          : [];
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];

        // Save incoming customer messages.
        for (const message of incomingMessages) {
          await saveIncomingMessage({
            message,
            contacts,
            metadata,
          });
        }

        // Update sent-message delivery/read status.
        for (const status of statuses) {
          await updateMessageStatus(status);
        }
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }
};

const saveIncomingMessage = async ({
  message,
  contacts,
  metadata,
}) => {
  const customerPhone = message.from ?? "";
  const customerProfile = contacts.find(
    (contact) => contact.wa_id === customerPhone
  );

  const customerName =
    customerProfile?.profile?.name || "Unknown customer";

  const messageType = message.type || "unknown";
  const messageText = extractMessageText(message);

  const whatsappMessageId =
    message.id || `${customerPhone}-${Date.now()}`;

  const messageReference = db
    .collection("messages")
    .doc(whatsappMessageId);

  const existingMessage = await messageReference.get();

  // Prevent duplicate documents if Meta retries the same webhook.
  if (existingMessage.exists) {
    console.log("Duplicate webhook ignored:", whatsappMessageId);
    return;
  }

  const timestampSeconds = Number(message.timestamp);

  const whatsappCreatedAt = Number.isFinite(timestampSeconds)
    ? Timestamp.fromMillis(timestampSeconds * 1000)
    : FieldValue.serverTimestamp();
  const messageData = {
    whatsappMessageId,
    direction: "incoming",
    phone: customerPhone,
    customerName,
    message: messageText,
    type: messageType,
    status: "received",

    displayPhoneNumber: metadata.display_phone_number || "",
    phoneNumberId: metadata.phone_number_id || "",

    whatsappCreatedAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),

    isRead: false,
  };

  await messageReference.set(messageData);

  console.log("Incoming WhatsApp message saved:", {
    whatsappMessageId,
    phone: maskPhone(customerPhone),
    type: messageType,
    message: messageText,
  });
};

const updateMessageStatus = async (statusData) => {
  const whatsappMessageId = statusData.id;

  if (!whatsappMessageId) {
    return;
  }

  const newStatus = statusData.status || "unknown";

  const matchingMessages = await db
    .collection("messages")
    .where("whatsappMessageId", "==", whatsappMessageId)
    .limit(1)
    .get();

  if (matchingMessages.empty) {
    console.log(
      "Status received before message was stored:",
      whatsappMessageId,
      newStatus
    );

    return;
  }

  const document = matchingMessages.docs[0];

  await document.ref.update({
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log("WhatsApp message status updated:", {
    whatsappMessageId,
    status: newStatus,
  });
};

const extractMessageText = (message) => {
  switch (message.type) {
    case "text":
      return message.text?.body || "";

    case "button":
      return message.button?.text || "";

    case "interactive":
      return (
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        "Interactive reply"
      );

    case "image":
      return message.image?.caption || "Image received";

    case "video":
      return message.video?.caption || "Video received";

    case "document":
      return message.document?.filename || "Document received";

    case "audio":
      return "Audio received";

    case "sticker":
      return "Sticker received";

    case "location":
      return "Location received";

    case "contacts":
      return "Contact received";

    default:
      return `${message.type || "Unknown"} message received`;
  }
};

const maskPhone = (phone = "") => {
  if (phone.length < 7) {
    return "****";
  }

  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
};
