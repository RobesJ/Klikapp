export interface Project {
  id: string;
  client_id?: string;
  type: string | null;
  state: string | null;
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