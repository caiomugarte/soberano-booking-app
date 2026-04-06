export interface ClientTheme {
  primaryColor: string;
  primaryColorHover: string;
  logoUrl: string | null;
}

export interface ClientConfig {
  name: string;
  timezone: string;
  enabledFeatures: string[];
  theme: ClientTheme;
}
