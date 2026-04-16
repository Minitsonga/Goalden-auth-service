import dotenv from "dotenv";

dotenv.config();

/**
 * Configuration centralisée - variables d'environnement
 */

function parseServiceSecrets(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  for (const entry of raw.split(",")) {
    const [serviceId, secret] = entry.split(":");
    if (serviceId && secret) {
      map.set(serviceId.trim(), secret.trim());
    }
  }
  return map;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3001", 10),

  mongodb: {
    uri: process.env.MONGO_URI ?? "",
  },

  jwt: {
    userSecret: process.env.USER_JWT_SECRET ?? "",
    userExpiresIn: process.env.USER_JWT_EXPIRES_IN ?? "1h",
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? "7d",
    serviceSecret: process.env.SERVICE_JWT_SECRET ?? "",
  },

  serviceSecrets: parseServiceSecrets(process.env.SERVICE_SECRETS ?? ""),
};
