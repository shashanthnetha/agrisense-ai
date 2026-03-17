export interface Analysis {
  disease_detected: boolean;
  disease_name: string;
  crop_type: string;
  confidence: number;
  affected_area_percent: number;
  visible_symptoms: string[];
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  reasoning: string;
}

export interface Treatment {
  immediate_action: string;
  organic_treatment: {
    method: string;
    materials: string[];
    dosage: string;
  };
  chemical_treatment: {
    product: string;
    active_ingredient: string;
    dosage: string;
  };
  prevention_tips: string[];
  recovery_timeline: string;
  warning_signs: string;
}

export interface ScanResponse {
  status: string;
  analysis: Analysis;
  treatment: Treatment | null;
  voice_data: string | null; // base64 string
}

export interface ScanHistoryItem {
  id: string;
  date: string;
  crop_type: string;
  disease_name: string;
  status: string;
}
