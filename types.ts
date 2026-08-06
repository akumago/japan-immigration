import type { ReactNode } from 'react';

export interface Stat {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
}

export enum CaseType {
  Theft = 'Theft',
  Fraud = 'Fraud',
  Violent = 'Violent',
  Community = 'Community',
  NationalSecurity = 'NationalSecurity',
  Infrastructure = 'Infrastructure',
  Cultural = 'Cultural',
}

export interface Case {
  type: CaseType;
  title: string;
  year: number | string;
  description: string;
  source?: {
    name: string;
    number: string;
  };
}

export interface ContentBlock {
  type: 'subheading' | 'paragraph' | 'list';
  text: string | string[];
}

export interface ReportSection {
  title: string;
  content: {
    introduction?: string;
    blocks?: ContentBlock[];
    stats?: Stat[];
    cases?: Case[];
    image?: {
      src: string;
      caption: string;
    };
    customComponent?: 'ViciousCycle' | 'StaticImmigrationChart' | 'YouTubeEmbed' | 'DichotomyOfLabor' | 'JapaneseLaborDilemma' | 'FiscalImpactAnalysis' | 'BorderlessWelfareState';
    videoId?: string;
  };
}

export interface ReportData {
  mainTitle: string;
  introduction: string;
  sections: ReportSection[];
}