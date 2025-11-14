import { Client, Project, User } from "./generics";

export interface Chimney {
  id: string;
  type: string | null;
  labelling: string | null;
  placement: string | null;
  appliance: string | null;
  note: string | null;
}

export interface ObjectWithRelations {
  object: {
    id: string;
    client_id?: string;
    address: string | null;
    streetNumber: string | null;
    city: string | null;
    country:  string | null;
  };
  client: Client;
  chimneys: Chimney[];
}

export interface ProjectWithRelations {
  project: Project;
  client: Client;
  users: User[];
  objects: ObjectWithRelations[];
}
