import axios from "axios";
import {
  getMessagesApiUrl,
  whatsappConfig,
} from "../config/whatsapp.js";

const whatsappApi = axios.create({
  timeout: 20000,
  headers: {
    Authorization: `Bearer ${whatsappConfig.accessToken}`,
    "Content-Type": "application/json",
  },
});

// Normalize phone number
export const normalizePhoneNumber = (phone) => {
  let normalizedPhone = String(phone || "").replace(/\D/g, "");

  // Remove leading zero
  if (normalizedPhone.startsWith("0")) {
    normalizedPhone = normalizedPhone.substring(1);
  }

  // Add India country code if missing
  if (
    normalizedPhone.length === 10 &&
    !normalizedPhone.startsWith("91")
  ) {
    normalizedPhone = `91${normalizedPhone}`;
  }

  return normalizedPhone;
};

// Send text message
export const sendWhatsAppTextMessage = async (phone, message) => {
  const normalizedPhone = normalizePhoneNumber(phone);
  const normalizedMessage = String(message || "").trim();

  if (!normalizedPhone) {
    throw new Error("A valid phone number is required.");
  }

  if (!normalizedMessage) {
    throw new Error("Message cannot be empty.");
  }

  console.log("Sending WhatsApp message");
  console.log("Phone:", normalizedPhone);
  console.log("Message:", normalizedMessage);

  const response = await whatsappApi.post(getMessagesApiUrl(), {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedPhone,
    type: "text",
    text: {
      preview_url: false,
      body: normalizedMessage,
    },
  });

  console.log("WhatsApp API Response:", response.data);

  return response.data;
};

// Send template message
export const sendWhatsAppTemplateMessage = async ({
  phone,
  templateName = "hello_world",
  languageCode = "en_US",
}) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedPhone) {
    throw new Error("A valid phone number is required.");
  }

  console.log("Sending Template Message");
  console.log("Phone:", normalizedPhone);
  console.log("Template:", templateName);

  const response = await whatsappApi.post(getMessagesApiUrl(), {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
    },
  });

  console.log("WhatsApp Template Response:", response.data);

  return response.data;
};
