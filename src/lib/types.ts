// lib/types.ts
// Type definitions for all datasets used in the report.

export interface VulnerabilityCountry {
  country: string;
  iso: string;
  vulnerability: number | null;
  readiness: number | null;
  gap: number | null;
  infraVulnerability: number | null;
}

export interface MapCountry {
  country: string;
  iso: string;
  gap: number | null;
  deaths: number;
  deathsPerEvent: number;
  events: number;
  affectedTotal: number;
  peakLossPctGDP: number | null;
  peakLossYear: number | null;
  peakLossUSD: number | null;
}

export interface DecadeTrend {
  decade: string;
  affected: number;
}

export interface Section3Data {
  countries: MapCountry[];
  decadeTrend: DecadeTrend[];
}

export interface DrrCountry {
  country: string;
  iso: string;
  infraVulnerability: number;
  drrImplementation: number;
  nationalFramework: boolean;
}

export interface FinanceYear {
  year: number;
  adaptationM: number;
  climateM: number;
}

export interface FinanceData {
  annualCommitments: FinanceYear[];
  referenceLines: {
    needed: { value: number; label: string };
    receivedLow: { value: number; label: string };
    receivedHigh: { value: number; label: string };
  };
}

// GeoJSON (minimal typing for what we use)
export interface PacificFeature {
  type: "Feature";
  properties: { name: string; iso3?: string; isPIC: boolean };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface PacificGeoJSON {
  type: "FeatureCollection";
  features: PacificFeature[];
}
