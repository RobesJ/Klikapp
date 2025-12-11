export interface Project {
  id: string;
  client_id?: string;
  type: string;
  state: string;
  scheduled_date: string | null;
  start_date: string | null;
  completion_date: string | null;
  note: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string | null;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  streetNumber: string | null;
  city: string | null;
  country:  string | null;
  type: string | null;
  note: string | null;
  projectsCount?: number;
  objectsCount?: number;
}

export interface PDF {
  id: string;
  project_id: string;
  object_id: string;
  chimney_id:string;
  report_type: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  modified_at: string;
  generated_at: string;
}