import axios from "axios";
import { db, FieldValue } from "../config/firebaseAdmin.js";

const getWhatsAppConfig = () => {
  const accessToken = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const graphApiVersion =
    process.env.GRAPH_API_VERSION || "v25.0";

  if (!accessToken) {
    throw new Error("WHATSAPP_TOKEN is missing.");
  }

  if (!phoneNumberId) {
    throw new Error("PHONE_NUMBER_ID is missing.");
  }

  return {
    accessToken,
    phoneNumberId,
    graphApiVersion,
  };
};

/**
 * Send a normal text message from Admin Panel.
 *
 * POST /api/whatsapp/send-message
 *
 * Body:
 * {
 *   "phone": "919999999999",
 *   "message": "Hello from WhatsApp CRM"
 * }
 */
export const sendTextMessage = async (req, res) => {
  try {
    const phone = String(req.body?.phone || "")
      .replace(/\D/g, "")
      .trim();

    const message = String(req.body?.message || "").trim();

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Customer phone number is required.",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message text is required.",
      });
    }

    const {
      accessToken,
      phoneNumberId,
      graphApiVersion,
    } = getWhatsAppConfig();

    const url =
      `https://graph.facebook.com/` +
      `${graphApiVersion}/${phoneNumberId}/messages`;

    const whatsappResponse = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const whatsappMessageId =
      whatsappResponse.data?.messages?.[0]?.id || "";

    const messageDocument = {
      whatsappMessageId,

      direction: "outgoing",

      phone,

      customerName:
        String(req.body?.customerName || "").trim() ||
        "Customer",

      message,

      type: "text",

      status: "sent",

      isRead: true,

      createdAt: FieldValue.serverTimestamp(),

      updatedAt: FieldValue.serverTimestamp(),
    };

    const documentReference = whatsappMessageId
      ? db.collection("messages").doc(whatsappMessageId)
      : db.collection("messages").doc();

    await documentReference.set(messageDocument);

    console.log("Outgoing WhatsApp message sent:", {
      whatsappMessageId,
      phone: maskPhone(phone),
      type: "text",
    });

    return res.status(200).json({
      success: true,
      message: "WhatsApp message sent successfully.",
      data: {
        whatsappMessageId,
        phone,
        status: "sent",
      },
    });
  } catch (error) {
    const metaError =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      error.message;

    console.error("Send WhatsApp message error:", metaError);

    return res.status(
      error.response?.status || 500
    ).json({
      success: false,
      message: "Failed to send WhatsApp message.",
      error:
        typeof metaError === "string"
          ? metaError
          : JSON.stringify(metaError),
    });
  }
};

/**
 * Send Meta approved template message.
 *
 * POST /api/whatsapp/send-template
 *
 * Body:
 * {
 *   "phone": "919999999999",
 *   "templateName": "hello_world",
 *   "languageCode": "en_US"
 * }
 */
export const sendTemplateMessage = async (req, res) => {
  try {
    const phone = String(req.body?.phone || "")
      .replace(/\D/g, "")
      .trim();

    const templateName =
      String(
        req.body?.templateName || "hello_world"
      ).trim();

    const languageCode =
      String(
        req.body?.languageCode || "en_US"
      ).trim();

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Customer phone number is required.",
      });
    }

    const {
      accessToken,
      phoneNumberId,
      graphApiVersion,
    } = getWhatsAppConfig();

    const url =
      `https://graph.facebook.com/` +
      `${graphApiVersion}/${phoneNumberId}/messages`;

    const whatsappResponse = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const whatsappMessageId =
      whatsappResponse.data?.messages?.[0]?.id || "";

    await db
      .collection("messages")
      .doc(
        whatsappMessageId ||
        `template-${Date.now()}`
      )
      .set({
        whatsappMessageId,

        direction: "outgoing",

        phone,

        customerName:
          String(req.body?.customerName || "").trim() ||
          "Customer",

        message: `Template: ${templateName}`,

        type: "template",

        templateName,

        languageCode,

        status: "sent",

        isRead: true,

        createdAt: FieldValue.serverTimestamp(),

        updatedAt: FieldValue.serverTimestamp(),
      });

    console.log("WhatsApp template message sent:", {
      whatsappMessageId,
      phone: maskPhone(phone),
      templateName,
    });

    return res.status(200).json({
      success: true,
      message:
        "WhatsApp template message sent successfully.",
      data: {
        whatsappMessageId,
        phone,
        templateName,
        status: "sent",
      },
    });
  } catch (error) {
    const metaError =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      error.message;

    console.error(
      "Send WhatsApp template error:",
      metaError
    );

    return res.status(
      error.response?.status || 500
    ).json({
      success: false,
      message:
        "Failed to send WhatsApp template message.",
      error:
        typeof metaError === "string"
          ? metaError
          : JSON.stringify(metaError),
    });
  }
};

const maskPhone = (phone = "") => {
  if (phone.length < 7) {
    return "****";
  }

  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
};
