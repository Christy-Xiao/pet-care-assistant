// Pet Types
export interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string;
  dateOfBirth: string;
  age: string;
  weight: number;
  gender: 'male' | 'female';
  avatar?: string;
  allergies: string[];
  medicalHistory: MedicalRecord[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  date: string;
  type: 'vaccination' | 'checkup' | 'surgery' | 'medication' | 'other';
  title: string;
  description: string;
  veterinarian?: string;
  hospital?: string;
  cost?: number;
  medication?: string[]; // 用药建议
}

// Care Schedule Types
export interface CareSchedule {
  id: string;
  petId: string;
  title: string;
  description: string;
  eventType: 'vaccination' | 'parasite_prevention' | 'wellness_exam' | 'dental_care' | 'grooming' | 'other';
  dueDate: string;
  completedDate?: string;
  status: 'pending' | 'completed' | 'skipped';
  priority: 'high' | 'medium' | 'low';
  recurrence?: {
    interval: number;
    unit: 'days' | 'weeks' | 'months' | 'years';
  };
  source?: string;
  notificationSent?: boolean;
}

export interface CareScheduleTemplate {
  id: string;
  name: string;
  description: string;
  pet_type: 'dog' | 'cat';
  event_type: string;
  start_condition: {
    age_months: number;
  };
  recurrence: {
    interval: number;
    unit: 'days' | 'weeks' | 'months' | 'years';
    conditions?: {
      age_max_months?: number;
    };
  };
  end_condition?: {
    age_months: number;
  };
  priority: 'high' | 'medium' | 'low';
  source: string;
}

// Health Analysis Types
export interface HealthAnalysis {
  id: string;
  petId: string;
  imageUrl: string;
  analysisType: 'feces' | 'skin' | 'eye' | 'ear' | 'other';
  result: {
    severity: 'normal' | 'mild' | 'moderate' | 'severe';
    description: string;
    recommendations: string[];
    needsImmediateCare: boolean;
  };
  createdAt: string;
}

// Map Types
export interface ParkLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  petFriendly: boolean;
  lawnSize: number; // 草坪面积（平方米）
  crowdLevel: 'low' | 'medium' | 'high';
  facilities: string[];
  rating: number;
  openHours: string;
}

// Weather Types
export interface Weather {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'windy';
  aqi: number;
  suggestion: string;
}

// Notification Types
export interface Notification {
  id: string;
  petId: string;
  petName: string;
  title: string;
  message: string;
  type: 'reminder' | 'alert' | 'info';
  read: boolean;
  createdAt: string;
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}
