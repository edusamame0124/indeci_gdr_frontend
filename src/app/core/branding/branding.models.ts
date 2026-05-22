export interface LoginBrandingResponse {
  institutionName: string | null;
  shortName: string | null;
  ruc: string | null;
  address: string | null;
  headerLogoUrl: string | null;
  mainLogoUrl: string | null;
  headerLogoAvailable: boolean;
  mainLogoAvailable: boolean;
}

export interface BrandingUpdateRequest {
  institutionName: string;
  shortName: string | null;
  ruc: string | null;
  address: string | null;
}
