export interface UserPayload {
  userId: string;
  email: string;
  globalRole: "USER" | "COACH" | "ADMIN";
}

export interface ServicePayload {
  serviceId: string;
  scope: "internal";
  permissions: string[];
}

export const SERVICE_PERMISSIONS: Record<string, string[]> = {
  "event-service": ["team:read", "user:read", "notification:write"],
  "social-service": ["team:read", "event:read", "user:read", "notification:write"],
  "team-service": ["user:read"],
  "notification-service": ["user:read"],
  "file-service": ["user:read"],
  "gateway": ["user:read"],
};
