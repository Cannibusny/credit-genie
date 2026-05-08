// State Statute of Limitations database + medical debt law info
import type { StateSOL } from "../types/index.js";

export const STATE_SOL_DATABASE: StateSOL[] = [
  { state: "NY", writtenContract: 72, oralContract: 72, promissoryNote: 72, openAccount: 72, medicalDebtBan: true, medicalDebtDetails: "New York has passed its own medical debt credit reporting ban — independent of vacated federal CFPB rule. All medical debts barred from credit reports.", agOffice: "Office of the Attorney General", agAddress: "The Capitol, Albany, NY 12224", agWebsite: "https://ag.ny.gov" },
  { state: "CA", writtenContract: 48, oralContract: 24, promissoryNote: 48, openAccount: 48, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "1300 I Street, Sacramento, CA 95814", agWebsite: "https://oag.ca.gov" },
  { state: "TX", writtenContract: 48, oralContract: 48, promissoryNote: 48, openAccount: 48, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "P.O. Box 12548, Austin, TX 78711", agWebsite: "https://www.texasattorneygeneral.gov" },
  { state: "FL", writtenContract: 60, oralContract: 48, promissoryNote: 60, openAccount: 48, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "The Capitol PL-01, Tallahassee, FL 32399", agWebsite: "http://www.myfloridalegal.com" },
  { state: "IL", writtenContract: 60, oralContract: 60, promissoryNote: 72, openAccount: 60, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "500 S. Second Street, Springfield, IL 62701", agWebsite: "https://www.illinoisattorneygeneral.gov" },
  { state: "PA", writtenContract: 48, oralContract: 48, promissoryNote: 48, openAccount: 48, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "16th Floor, Strawberry Square, Harrisburg, PA 17120", agWebsite: "https://www.attorneygeneral.gov" },
  { state: "OH", writtenContract: 72, oralContract: 72, promissoryNote: 180, openAccount: 48, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "30 E Broad St, Columbus, OH 43215", agWebsite: "https://www.ohioattorneygeneral.gov" },
  { state: "GA", writtenContract: 72, oralContract: 48, promissoryNote: 72, openAccount: 48, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "40 Capitol Square SW, Atlanta, GA 30334", agWebsite: "https://law.georgia.gov" },
  { state: "NJ", writtenContract: 72, oralContract: 72, promissoryNote: 72, openAccount: 72, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "25 Market Street, Trenton, NJ 08625", agWebsite: "https://www.njoag.gov" },
  { state: "NC", writtenContract: 36, oralContract: 36, promissoryNote: 60, openAccount: 36, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "9001 Mail Service Center, Raleigh, NC 27699", agWebsite: "https://ncdoj.gov" },
  { state: "MI", writtenContract: 72, oralContract: 72, promissoryNote: 72, openAccount: 72, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "P.O. Box 30212, Lansing, MI 48909", agWebsite: "https://www.michigan.gov/ag" },
  { state: "VA", writtenContract: 60, oralContract: 36, promissoryNote: 72, openAccount: 36, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "202 N. 9th Street, Richmond, VA 23219", agWebsite: "https://www.oag.state.va.us" },
  { state: "WA", writtenContract: 72, oralContract: 36, promissoryNote: 72, openAccount: 36, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "800 Fifth Avenue, Suite 2000, Seattle, WA 98104", agWebsite: "https://www.atg.wa.gov" },
  { state: "MA", writtenContract: 72, oralContract: 72, promissoryNote: 72, openAccount: 72, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "One Ashburton Place, Boston, MA 02108", agWebsite: "https://www.mass.gov/ago" },
  { state: "CO", writtenContract: 72, oralContract: 72, promissoryNote: 72, openAccount: 72, medicalDebtBan: true, medicalDebtDetails: "Colorado restricts medical debt reporting for debts under $500 and debts less than 6 months old.", agOffice: "Office of the Attorney General", agAddress: "1300 Broadway, Denver, CO 80203", agWebsite: "https://coag.gov" },
  { state: "CT", writtenContract: 72, oralContract: 36, promissoryNote: 72, openAccount: 72, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "165 Capitol Avenue, Hartford, CT 06106", agWebsite: "https://portal.ct.gov/AG" },
  { state: "AZ", writtenContract: 72, oralContract: 36, promissoryNote: 72, openAccount: 36, medicalDebtBan: false, medicalDebtDetails: null, agOffice: "Office of the Attorney General", agAddress: "2005 N Central Ave, Phoenix, AZ 85004", agWebsite: "https://www.azag.gov" },
];

export function getStateSOL(state: string): StateSOL | null {
  return STATE_SOL_DATABASE.find(s => s.state === state.toUpperCase()) ?? null;
}

export function getSOLMonths(state: string, debtType: "credit_card" | "medical" | "personal_loan" | "auto"): number {
  const sol = getStateSOL(state);
  if (!sol) return 48; // default 4 years if state not found
  switch (debtType) {
    case "credit_card": return sol.openAccount;
    case "medical": return sol.writtenContract;
    case "personal_loan": return sol.promissoryNote;
    case "auto": return sol.writtenContract;
    default: return sol.writtenContract;
  }
}

export function hasMedicalDebtBan(state: string): boolean {
  const sol = getStateSOL(state);
  return sol?.medicalDebtBan ?? false;
}
