/** Info gathered about the meeting invitee */
export interface PersonInfo {
  name: string;
  email: string;
  domain: string;
  companyName: string | null;
  companyDescription: string | null;
  linkedinUrl: string | null;
}

/** Info gathered about a company from its website */
export interface CompanyInfo {
  domain: string;
  name: string | null;
  description: string | null;
  industry: string | null;
}

/** LinkedIn search result */
export interface LinkedInResult {
  linkedinUrl: string;
}
