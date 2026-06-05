const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true, default: '' },
    resource:    { type: String, required: true, trim: true },
    action:      { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

permissionSchema.index({ resource: 1, action: 1 });

module.exports = mongoose.model('Permission', permissionSchema);
