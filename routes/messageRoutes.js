import express from "express";

import {
  receiveWhatsAppWebhook,
  sendTemplateMessage,
  sendTextMessage,
} from "../controllers/messageController.js";

import { whatsappConfig } from "../config/whatsapp.js";

const router = express.Router();

router.post("/send-message", sendTextMessage);

router.post("/send-template", sendTemplateMessage);

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === whatsappConfig.verifyToken) {
    console.log("WhatsApp webhook verification successful.");

    return res.status(200).send(challenge);
  }

  console.warn("WhatsApp webhook verification failed.");

  return res.sendStatus(403);
});

router.post("/webhook", receiveWhatsAppWebhook);

export default router;
