import { ProviderContext } from "../common/provider.types";
export type ProviderOperationData = Record<string, unknown>;
export interface ProviderOperationRequest { context: ProviderContext; data: ProviderOperationData }
