export interface HubNewsItem {
  id: string;
  sourceRecordId?: string;
  title: string;
  date: string;
  pubDate?: string;
  location: string;
  prefecture?: string;
  media: string;
  stage?: string;
  url: string;
  summary: string;
  nationality?: string;
  crimeCategory?: string;
}

export type HubMode = 'category' | 'stage' | 'topic' | 'area' | 'month' | 'cross';

export interface HubStats {
  totalAll: number;
  count: number;
  sharePct: string;
  latestDate: string;
  topNats: [string, number][];
  topPrefs: [string, number][];
  topCats: [string, number][];
  topStages: [string, number][];
}

export interface HubFaq {
  q: string;
  a: string;
}

export interface HubSeoMeta {
  mode: HubMode;
  slug: string;
  label: string;
  path: string;
  canonicalUrl: string;
  badge: string;
  title: string;
  h1: string;
  desc: string;
  keywords: string;
  leadParagraph: string;
  guidePath: string;
  guideLabel: string;
  stats: HubStats;
  faqs: HubFaq[];
}

export interface EligibleHub extends HubSeoMeta {
  def: Record<string, any>;
  items: HubNewsItem[];
}

export function formatMonthLabel(ym: string): string;
export function getMonthDefinitions(items: HubNewsItem[]): Record<string, any>[];
export function getHubDefinition(items: HubNewsItem[], mode: HubMode, slug: string): Record<string, any> | null;
export function filterItemsByHub(items: HubNewsItem[], mode: HubMode, defOrSlug: Record<string, any> | string): HubNewsItem[];
export function summarizeHubItems(items: HubNewsItem[], matched: HubNewsItem[]): HubStats;
export function buildHubSeoMeta(items: HubNewsItem[], mode: HubMode, def: Record<string, any>, matched: HubNewsItem[]): HubSeoMeta;
export function getAllEligibleHubs(items: HubNewsItem[]): EligibleHub[];
export const crimeHubs: Record<string, any>;
