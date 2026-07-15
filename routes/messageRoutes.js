import express from "express";

import {
  receiveWebhook,
  verifyWebhook,
} from "../controllers/webhookController.js";

import {
  sendTemplateMessage,
  sendTextMessage,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/webhook", verifyWebhook);

router.post("/webhook", receiveWebhook);

router.post("/send-message", sendTextMessage);

router.post("/send-template", sendTemplateMessage);

export default router;
