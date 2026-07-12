import {
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
} from "../utils/sendMessage.js";

const extractMetaError = (error) => {
  const metaError = error.response?.data?.error;

  if (metaError) {
    return {
      message: metaError.message,
      type: metaError.type,
      code: metaError.code,
      errorSubcode: metaError.error_subcode,
      traceId: metaError.fbtrace_id,
    };
  }

  return {
    message: error.message || "Unknown server error.",
  };
};

export const sendTextMessage = async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: "Phone and message are required.",
      });
    }

    const result = await sendWhatsAppTextMessage(phone, message);

    return res.status(200).json({
      success: true,
      message: "WhatsApp text message submitted successfully.",
      data: result,
    });
  } catch (error) {
    const errorDetails = extractMetaError(error);

    console.error("WhatsApp text-message error:", errorDetails);

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "WhatsApp text message could not be sent.",
      error: errorDetails,
    });
  }
};

export const sendTemplateMessage = async (req, res) => {
  try {
    const {
      phone,
      templateName = "hello_world",
      languageCode = "en_US",
    } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    const result = await sendWhatsAppTemplateMessage({
      phone,
      templateName,
      languageCode,
    });

    return res.status(200).json({
      success: true,
      message: "WhatsApp template message submitted successfully.",
      data: result,
    });
  } catch (error) {
    const errorDetails = extractMetaError(error);

    console.error("WhatsApp template-message error:", errorDetails);

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "WhatsApp template message could not be sent.",
      error: errorDetails,
    });
  }
};

export const receiveWhatsAppWebhook = (req, res) => {
  try {
    const webhookBody = req.body;

    if (webhookBody.object !== "whatsapp_business_account") {
      return res.sendStatus(404);
    }

    const entries = webhookBody.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value || {};

        const incomingMessages = value.messages || [];

        for (const incomingMessage of incomingMessages) {
          console.log("Incoming WhatsApp message:", {
            from: incomingMessage.from,
            messageId: incomingMessage.id,
            timestamp: incomingMessage.timestamp,
            type: incomingMessage.type,
            text: incomingMessage.text?.body || null,
          });
        }

        const messageStatuses = value.statuses || [];

        for (const messageStatus of messageStatuses) {
          console.log("WhatsApp delivery status:", {
            messageId: messageStatus.id,
            status: messageStatus.status,
            recipient: messageStatus.recipient_id,
            timestamp: messageStatus.timestamp,
          });
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook processing error:", error);

    return res.sendStatus(500);
  }
};
