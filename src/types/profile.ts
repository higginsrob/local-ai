// User profile types

export interface Profile {
  name: string;
  attributes: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileAttributes {
  role?: string;
  expertise?: string[];
  preferences?: Record<string, any>;
  [key: string]: any;
}

