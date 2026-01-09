
export type ArtifactStatus = 'idle' | 'streaming' | 'complete' | 'error';

export interface Artifact {
  id: string;
  title: string;
  type: 'ui' | 'logic' | 'architecture';
  content: string;
  status: ArtifactStatus;
  reasoning?: string;
  variations?: string[]; // Stocke les versions précédentes
  currentVariationIndex?: number;
}

export interface Session {
  id: string;
  prompt: string;
  artifacts: Artifact[];
  timestamp: number;
}

export interface Variation {
  name: string;
  description: string;
  content: string;
}
