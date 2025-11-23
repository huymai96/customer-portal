import { fetchAllRestStyles } from '@/integrations/ssactivewear/rest-client';

export async function listAllSsStyles(): Promise<string[]> {
  const styles = await fetchAllRestStyles();
  return styles
    .map((style) => style.partNumber?.trim().toUpperCase())
    .filter((part): part is string => Boolean(part));
}

