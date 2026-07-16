import dotenv from "dotenv";

dotenv.config();

const getRequiredEnvironmentVariable = (variableName) => {
  const value = process.env[variableName]?.trim();

  if (!value) {
    throw new Error(
      `${variableName} is missing from the environment variables.`
    );
  }

  return value;
};

const graphApiVersion =
  process.env.GRAPH_API_VERSION?.trim() || "v25.0";

export const whatsappConfig = {
  accessToken: getRequiredEnvironmentVariable(
    "WHATSAPP_TOKEN"
  ),

  phoneNumberId: getRequiredEnvironmentVariable(
    "PHONE_NUMBER_ID"
  ),

  businessAccountId:
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || "",

  verifyToken: getRequiredEnvironmentVariable(
    "WEBHOOK_VERIFY_TOKEN"
  ),

  graphApiVersion,
};

export const getMessagesApiUrl = () => {
  return (
    `https://graph.facebook.com/` +
    `${whatsappConfig.graphApiVersion}/` +
    `${whatsappConfig.phoneNumberId}/messages`
  );
};
