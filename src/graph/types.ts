export interface PersonNode {
  id: string;
  name: string;
  is_internal: boolean;
  linkedin_url?: string;
  email?: string;
}

export interface AccountNode {
  id: string;
  name: string;
  domain?: string;
}

export interface EventNode {
  id: string;
  name: string;
  date?: string;
}

export interface BuyingGroupMember {
  person: PersonNode;
  role?: string;
  confirmation?: string;
  start_date?: string;
}

export interface PathHop {
  person: PersonNode;
  relationship: string;
  weight?: number;
}

export interface WarmIntroPath {
  hops: PathHop[];
  length: number;
}
