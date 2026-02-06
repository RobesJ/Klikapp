import { Client, Project, User } from "./generics";
import { ObjectWithRelations } from "./objectSpecific";

export interface ProjectWithRelations {
  project: Project;
  client: Client;
  users: User[];
  objects: ObjectWithRelations[];
}

export interface Photo {
  id: string;
  project_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_at: string;
}

export interface ProjectFilters {
  type: string[];
  state: string[];
  users: string[];
  cities?: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  searchQuery?: string;
}