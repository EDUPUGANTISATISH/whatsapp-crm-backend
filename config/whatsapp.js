import dotenv from "dotenv";

dotenv.config();

const requiredEnvironmentVariables = [
  "WHATSAPP_TOKEN",
  "PHONE_NUMBER_ID",
  "WEBHOOK_VERIFY_TOKEN",
];

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    console.warn(`Warning: ${variableName} is missing from the .env file.`);
  }
}

export const whatsappConfig = {
  accessToken: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.PHONE_NUMBER_ID,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  verifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
  graphApiVersion: process.env.GRAPH_API_VERSION || "v25.0",
};

export const getMessagesApiUrl = () => {
  return `https://graph.facebook.com/${whatsappConfig.graphApiVersion}/${whatsappConfig.phoneNumberId}/messages`;
};
