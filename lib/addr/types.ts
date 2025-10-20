/**
 * 주소 관련 타입 정의
 */

export interface AddressColumn {
  name: string;
  confidence: number;
  reason: string;
}

export interface DetectedAddressColumn {
  column: string;
  confidence: number;
  details: {
    headerMatch: number;
    valueMatch: number;
    sampleValues: string[];
  };
}

export interface NormalizedAddress {
  original: string;
  normalized: string;
  sido?: string;
  sigungu?: string;
  dong?: string;
  confidence: number;
  corrections?: string[];
}