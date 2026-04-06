import { useClientConfig } from '../theme/ClientConfigProvider';

export function useFeature(feature: string): boolean {
  const { enabledFeatures } = useClientConfig();
  return enabledFeatures.includes(feature);
}
