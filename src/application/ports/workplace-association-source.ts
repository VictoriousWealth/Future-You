import type { WorkplaceAssociation } from "./financial-context-version-repository";

export interface WorkplaceAssociationSource {
  getWorkplace(): Promise<WorkplaceAssociation | null>;
}
