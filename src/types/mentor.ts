// Bit flag enums
export enum MentoringLevel {
  Entry = 1,       // 0001 (2^0)
  Senior = 2,      // 0010 (2^1)
  Staff = 4,       // 0100 (2^2)
  Management = 8   // 1000 (2^3)
}

export enum PaymentType {
  Venmo = 1,       // 000001 (2^0)
  Paypal = 2,      // 000010 (2^1)
  Zelle = 4,       // 000100 (2^2)
  Alipay = 8,      // 001000 (2^3)
  Wechat = 16,     // 010000 (2^4)
  Crypto = 32      // 100000 (2^5)
}

export enum ExpertiseDomain {
  TechnicalDevelopment = 1,    // 0001 (2^0) - Software engineering, data science, AI
  ProductAndProject = 2,       // 0010 (2^1) - Product management, project management
  ManagementAndStrategy = 4,   // 0100 (2^2) - Team leadership, strategy, planning
  CareerDevelopment = 8        // 1000 (2^3) - Career planning, coaching, growth
}

export enum ExpertiseTopic {
  CareerTransition = 1,        // 000001 (2^0)
  TechnicalSkills = 2,         // 000010 (2^1)
  Leadership = 4,              // 000100 (2^2)
  Communication = 8,           // 001000 (2^3)
  InterviewPrep = 16,          // 010000 (2^4)
  Negotiation = 32,            // 100000 (2^5)
  TimeManagement = 64,         // 1000000 (2^6)
  Fundraising = 128,           // 10000000 (2^7)
  VolunteerManagement = 256,   // 100000000 (2^8)
  StrategicPlanning = 512      // 1000000000 (2^9)
}

export interface MentorProfile {
  id: string;
  user_id: string;
  nick_name: string;
  bio: string;
  mentoring_levels: number; // Bit flags - now represents "which levels can this mentor guide"
  availability: string | null; // Free text description
  hourly_rate: number | null;
  payment_types: number; // Bit flags
  expertise_domains: number; // Bit flags - mentor's professional domains
  expertise_topics_preset: number; // Bit flags - predefined expertise topics
  expertise_topics_custom: string[]; // Custom tags as array
  allow_reviews: boolean;
  allow_recording: boolean;
  linkedin_url: string | null; // LinkedIn profile URL
  created_at: number;
  updated_at: number;
}

// Helper functions for bit flag manipulation
export function hasLevel(levels: number, level: MentoringLevel): boolean {
  return (levels & level) !== 0;
}

export function addLevel(levels: number, level: MentoringLevel): number {
  return levels | level;
}

export function removeLevel(levels: number, level: MentoringLevel): number {
  return levels & ~level;
}

export function toggleLevel(levels: number, level: MentoringLevel): number {
  return levels ^ level;
}

export function getLevelNames(levels: number): string[] {
  const names: string[] = [];
  if (levels & MentoringLevel.Entry) names.push('Entry');
  if (levels & MentoringLevel.Senior) names.push('Senior');
  if (levels & MentoringLevel.Staff) names.push('Staff');
  if (levels & MentoringLevel.Management) names.push('Management');
  return names;
}

export function hasPaymentType(types: number, type: PaymentType): boolean {
  return (types & type) !== 0;
}

export function addPaymentType(types: number, type: PaymentType): number {
  return types | type;
}

export function removePaymentType(types: number, type: PaymentType): number {
  return types & ~type;
}

export function togglePaymentType(types: number, type: PaymentType): number {
  return types ^ type;
}

export function getPaymentTypeNames(types: number): string[] {
  const names: string[] = [];
  if (types & PaymentType.Venmo) names.push('Venmo');
  if (types & PaymentType.Paypal) names.push('Paypal');
  if (types & PaymentType.Zelle) names.push('Zelle');
  if (types & PaymentType.Alipay) names.push('Alipay');
  if (types & PaymentType.Wechat) names.push('WeChat');
  if (types & PaymentType.Crypto) names.push('Crypto');
  return names;
}

// Convert array of level names to bit flags
export function levelsFromNames(names: string[]): number {
  let levels = 0;
  for (const name of names) {
    switch (name.toLowerCase()) {
      case 'entry': levels |= MentoringLevel.Entry; break;
      case 'senior': levels |= MentoringLevel.Senior; break;
      case 'staff': levels |= MentoringLevel.Staff; break;
      case 'management': levels |= MentoringLevel.Management; break;
    }
  }
  return levels;
}

// Convert array of payment type names to bit flags
export function paymentTypesFromNames(names: string[]): number {
  let types = 0;
  for (const name of names) {
    switch (name.toLowerCase()) {
      case 'venmo': types |= PaymentType.Venmo; break;
      case 'paypal': types |= PaymentType.Paypal; break;
      case 'zelle': types |= PaymentType.Zelle; break;
      case 'alipay': types |= PaymentType.Alipay; break;
      case 'wechat': types |= PaymentType.Wechat; break;
      case 'crypto': types |= PaymentType.Crypto; break;
    }
  }
  return types;
}

// Helper functions for expertise domains
export function hasDomain(domains: number, domain: ExpertiseDomain): boolean {
  return (domains & domain) !== 0;
}

export function addDomain(domains: number, domain: ExpertiseDomain): number {
  return domains | domain;
}

export function removeDomain(domains: number, domain: ExpertiseDomain): number {
  return domains & ~domain;
}

export function toggleDomain(domains: number, domain: ExpertiseDomain): number {
  return domains ^ domain;
}

export function getDomainNames(domains: number): string[] {
  const names: string[] = [];
  if (domains & ExpertiseDomain.TechnicalDevelopment) names.push('TechnicalDevelopment');
  if (domains & ExpertiseDomain.ProductAndProject) names.push('ProductAndProject');
  if (domains & ExpertiseDomain.ManagementAndStrategy) names.push('ManagementAndStrategy');
  if (domains & ExpertiseDomain.CareerDevelopment) names.push('CareerDevelopment');
  return names;
}

export function domainsFromNames(names: string[]): number {
  let domains = 0;
  for (const name of names) {
    switch (name.toLowerCase()) {
      case 'technicaldevelopment': domains |= ExpertiseDomain.TechnicalDevelopment; break;
      case 'productandproject': domains |= ExpertiseDomain.ProductAndProject; break;
      case 'managementandstrategy': domains |= ExpertiseDomain.ManagementAndStrategy; break;
      case 'careerdevelopment': domains |= ExpertiseDomain.CareerDevelopment; break;
    }
  }
  return domains;
}

// Helper functions for expertise topics
export function hasTopic(topics: number, topic: ExpertiseTopic): boolean {
  return (topics & topic) !== 0;
}

export function addTopic(topics: number, topic: ExpertiseTopic): number {
  return topics | topic;
}

export function removeTopic(topics: number, topic: ExpertiseTopic): number {
  return topics & ~topic;
}

export function toggleTopic(topics: number, topic: ExpertiseTopic): number {
  return topics ^ topic;
}

export function getTopicNames(topics: number): string[] {
  const names: string[] = [];
  if (topics & ExpertiseTopic.CareerTransition) names.push('CareerTransition');
  if (topics & ExpertiseTopic.TechnicalSkills) names.push('TechnicalSkills');
  if (topics & ExpertiseTopic.Leadership) names.push('Leadership');
  if (topics & ExpertiseTopic.Communication) names.push('Communication');
  if (topics & ExpertiseTopic.InterviewPrep) names.push('InterviewPrep');
  if (topics & ExpertiseTopic.Negotiation) names.push('Negotiation');
  if (topics & ExpertiseTopic.TimeManagement) names.push('TimeManagement');
  if (topics & ExpertiseTopic.Fundraising) names.push('Fundraising');
  if (topics & ExpertiseTopic.VolunteerManagement) names.push('VolunteerManagement');
  if (topics & ExpertiseTopic.StrategicPlanning) names.push('StrategicPlanning');
  return names;
}

export function topicsFromNames(names: string[]): number {
  let topics = 0;
  for (const name of names) {
    switch (name.toLowerCase()) {
      case 'careertransition': topics |= ExpertiseTopic.CareerTransition; break;
      case 'technicalskills': topics |= ExpertiseTopic.TechnicalSkills; break;
      case 'leadership': topics |= ExpertiseTopic.Leadership; break;
      case 'communication': topics |= ExpertiseTopic.Communication; break;
      case 'interviewprep': topics |= ExpertiseTopic.InterviewPrep; break;
      case 'negotiation': topics |= ExpertiseTopic.Negotiation; break;
      case 'timemanagement': topics |= ExpertiseTopic.TimeManagement; break;
      case 'fundraising': topics |= ExpertiseTopic.Fundraising; break;
      case 'volunteermanagement': topics |= ExpertiseTopic.VolunteerManagement; break;
      case 'strategicplanning': topics |= ExpertiseTopic.StrategicPlanning; break;
    }
  }
  return topics;
}
