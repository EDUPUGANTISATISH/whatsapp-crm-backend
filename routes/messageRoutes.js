import express from "express";

import {
  receiveWebhook,
  verifyWebhook,
} from "../controllers/webhookController.js";

import {
  sendTemplateMessage,
} from "../controllers/messageController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| WhatsApp Webhook Verification
|--------------------------------------------------------------------------
| Meta verifies the Render webhook URL using this GET request.
|
| Final URL:
| GET /api/whatsapp/webhook
*/
router.get("/webhook", verifyWebhook);

/*
|--------------------------------------------------------------------------
| Receive Incoming WhatsApp Messages
|--------------------------------------------------------------------------
| Meta sends customer messages and status updates to this POST route.
|
| Final URL:
| POST /api/whatsapp/webhook
*/
router.post("/webhook", receiveWebhook);

/*
|--------------------------------------------------------------------------
| Send WhatsApp Template Message
|--------------------------------------------------------------------------
| Your React app or Thunder Client uses this route to send templates.
|
| Final URL:
| POST /api/whatsapp/send-template
*/
router.post("/send-template", sendTemplateMessage);

export default router;
