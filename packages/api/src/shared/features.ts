export const FEATURES = {
  BOOKING: 'booking',
  ADMIN_DASHBOARD: 'admin-dashboard',
  SCHEDULE_MANAGEMENT: 'schedule-management',
  WHATSAPP_NOTIFICATIONS: 'whatsapp-notifications',
  MANUAL_BOOKING: 'manual-booking',
  WHATSAPP_AI_CHATBOT: 'whatsapp-ai-chatbot',
  AI_FEATURES: 'ai-features',
} as const

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES]

export const PLAN_FEATURES: Record<'site-only' | 'ai', FeatureKey[]> = {
  'site-only': [
    FEATURES.BOOKING,
    FEATURES.ADMIN_DASHBOARD,
    FEATURES.SCHEDULE_MANAGEMENT,
  ],
  'ai': [
    FEATURES.BOOKING,
    FEATURES.ADMIN_DASHBOARD,
    FEATURES.SCHEDULE_MANAGEMENT,
    FEATURES.WHATSAPP_NOTIFICATIONS,
    FEATURES.MANUAL_BOOKING,
    FEATURES.WHATSAPP_AI_CHATBOT,
    FEATURES.AI_FEATURES,
  ],
}
