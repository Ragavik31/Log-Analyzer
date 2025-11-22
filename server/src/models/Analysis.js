import mongoose from 'mongoose';

const AnalysisSchema = new mongoose.Schema(
  {
    hash: { type: String, index: true, unique: true, required: true },
    inputPreview: { type: Object },
    maskedPayload: { type: String, required: true },
    result: {
      severity: { type: String },
      root_cause: { type: String },
      proposed_solution: { type: String },
      raw: { type: Object },
      fromCache: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const AnalysisModel =
  mongoose.models.Analysis || mongoose.model('Analysis', AnalysisSchema);
