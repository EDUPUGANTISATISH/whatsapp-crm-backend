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

export const normalizePhoneNumber = (phone) => {
  return String(phone || "").replace(/\D/g, "");
};

export const sendWhatsAppTextMessage = async (phone, message) => {
  const normalizedPhone = normalizePhoneNumber(phone);
  const normalizedMessage = String(message || "").trim();

  if (!normalizedPhone) {
    throw new Error("A valid phone number is required.");
  }

  if (!normalizedMessage) {
    throw new Error("Message cannot be empty.");
  }

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

  return response.data;
};

export const sendWhatsAppTemplateMessage = async ({
  phone,
  templateName = "hello_world",
  languageCode = "en_US",
}) => {
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedPhone) {
    throw new Error("A valid phone number is required.");
  }

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

  return response.data;
};
