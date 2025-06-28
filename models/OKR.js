const mongoose = require('mongoose');

const okrSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'OKR title is required'],
    trim: true
  },
  objective: {
    type: String,
    required: [true, 'Objective is required'],
    trim: true
  },
  keyResults: [{
    description: {
      type: String,
      required: [true, 'Key result description is required'],
      trim: true
    },
    target: {
      type: String,
      trim: true
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  }],
  assignedTo: {
    type: {
      type: String,
      enum: ['user', 'team'],
      required: [true, 'Assignment type is required']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    }
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned by is required']
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization is required']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  completedDate: {
    type: Date
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calculate overall progress based on key results
okrSchema.methods.calculateProgress = function() {
  if (this.keyResults.length === 0) return 0;
  
  const totalProgress = this.keyResults.reduce((sum, kr) => sum + kr.progress, 0);
  return Math.round(totalProgress / this.keyResults.length);
};

// Virtual for overall progress
okrSchema.virtual('overallProgress').get(function() {
  return this.calculateProgress();
});

// Ensure virtual fields are serialized
okrSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('OKR', okrSchema); 