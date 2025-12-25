import { Client } from "./generics";

export interface Object {
  id: string;
  client_id: string;
  address: string | null;
  city: string | null;
  streetNumber: string | null;
  country: string | null;
  locked_by?: string | null;
  locked_by_name?: string | null;
  locked_at?: string | null;
  lock_expires_at?: string | null;
}

export interface ChimneyType {
  id: string;
  type: string;
  labelling: string | null;
}
  
export interface Chimney {
  id: string;
  chimney_type_id: string;
  chimney_type?: ChimneyType;
  placement: string | null;
  appliance: string | null;
  note: string | null;
}

export interface ChimneyInput extends Omit<Chimney, 'id'> {
  id?: string;
}

export interface ObjectWithRelations {
  object: Object;
  client: Client;
  chimneys: Chimney[];
}