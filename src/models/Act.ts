import mongoose from 'mongoose';

export interface IAct {
  characters: string[];
  description: string;
  actions?: string[];  // these actions MUST happen in the act.  Format: [character] [action] [character] [variable], e.g. "Greg gives Mallory a flower" or "Jackie attacks Greg with a hex" or "Sevrus follows Anna"
  movedCharacters?: string[];
  length_modifier?: number;
}

const ActSchema = new mongoose.Schema<IAct>({
  characters: [String],
  description: String,
  actions: [String],    
  movedCharacters: [String],
  length_modifier: Number, // 0.50 would be 50% length
}, {_id: false});

export default ActSchema;