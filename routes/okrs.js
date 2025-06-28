const express = require('express');
const { body, validationResult } = require('express-validator');
const OKR = require('../models/OKR');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/okrs
// @desc    Get all OKRs for user's organization
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, assignedTo, priority } = req.query;
    const filter = { organization: req.user.organization, isActive: true };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo === 'me') {
      filter['assignedTo.user'] = req.user._id;
    } else if (assignedTo === 'team' && req.user.team) {
      filter['assignedTo.team'] = req.user.team;
    }

    const okrs = await OKR.find(filter)
      .populate('assignedTo.user', 'firstName lastName email')
      .populate('assignedTo.team', 'name')
      .populate('assignedBy', 'firstName lastName')
      .populate('organization', 'name')
      .populate('department', 'name')
      .populate('team', 'name')
      .populate('comments.user', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(okrs);
  } catch (error) {
    console.error('Get OKRs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/okrs/:id
// @desc    Get single OKR
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const okr = await OKR.findById(req.params.id)
      .populate('assignedTo.user', 'firstName lastName email')
      .populate('assignedTo.team', 'name')
      .populate('assignedBy', 'firstName lastName')
      .populate('organization', 'name')
      .populate('department', 'name')
      .populate('team', 'name')
      .populate('comments.user', 'firstName lastName');

    if (!okr) {
      return res.status(404).json({ message: 'OKR not found' });
    }

    // Check if user has access to this OKR
    if (okr.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(okr);
  } catch (error) {
    console.error('Get OKR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/okrs
// @desc    Create new OKR
// @access  Private
router.post('/', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('objective').notEmpty().withMessage('Objective is required'),
  body('keyResults').isArray({ min: 1 }).withMessage('At least one key result is required'),
  body('keyResults.*.description').notEmpty().withMessage('Key result description is required'),
  body('assignedTo.type').isIn(['user', 'team']).withMessage('Assignment type must be user or team'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      objective,
      keyResults,
      assignedTo,
      priority,
      dueDate
    } = req.body;

    const okr = new OKR({
      title,
      objective,
      keyResults,
      assignedTo,
      assignedBy: req.user._id,
      organization: req.user.organization,
      department: req.user.department,
      team: req.user.team,
      priority: priority || 'medium',
      dueDate: new Date(dueDate)
    });

    await okr.save();

    const populatedOkr = await OKR.findById(okr._id)
      .populate('assignedTo.user', 'firstName lastName email')
      .populate('assignedTo.team', 'name')
      .populate('assignedBy', 'firstName lastName')
      .populate('organization', 'name')
      .populate('department', 'name')
      .populate('team', 'name');

    res.status(201).json(populatedOkr);
  } catch (error) {
    console.error('Create OKR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/okrs/:id
// @desc    Update OKR
// @access  Private
router.put('/:id', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('objective').notEmpty().withMessage('Objective is required'),
  body('keyResults').isArray({ min: 1 }).withMessage('At least one key result is required'),
  body('keyResults.*.description').notEmpty().withMessage('Key result description is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const okr = await OKR.findById(req.params.id);
    if (!okr) {
      return res.status(404).json({ message: 'OKR not found' });
    }

    // Check if user has permission to update
    const canUpdate = req.user.role === 'admin' || 
                     okr.assignedBy.toString() === req.user._id.toString() ||
                     (okr.assignedTo.type === 'user' && okr.assignedTo.user.toString() === req.user._id.toString());

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      title,
      objective,
      keyResults,
      assignedTo,
      priority,
      dueDate,
      status
    } = req.body;

    okr.title = title;
    okr.objective = objective;
    okr.keyResults = keyResults;
    okr.priority = priority || okr.priority;
    okr.dueDate = new Date(dueDate);
    
    if (assignedTo) okr.assignedTo = assignedTo;
    if (status) {
      okr.status = status;
      if (status === 'completed') {
        okr.completedDate = new Date();
      }
    }

    await okr.save();

    const updatedOkr = await OKR.findById(okr._id)
      .populate('assignedTo.user', 'firstName lastName email')
      .populate('assignedTo.team', 'name')
      .populate('assignedBy', 'firstName lastName')
      .populate('organization', 'name')
      .populate('department', 'name')
      .populate('team', 'name')
      .populate('comments.user', 'firstName lastName');

    res.json(updatedOkr);
  } catch (error) {
    console.error('Update OKR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/okrs/:id/progress
// @desc    Update OKR progress
// @access  Private
router.patch('/:id/progress', [
  auth,
  body('keyResults').isArray().withMessage('Key results array is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const okr = await OKR.findById(req.params.id);
    if (!okr) {
      return res.status(404).json({ message: 'OKR not found' });
    }

    // Check if user can update progress
    const canUpdateProgress = req.user.role === 'admin' ||
                             okr.assignedBy.toString() === req.user._id.toString() ||
                             (okr.assignedTo.type === 'user' && okr.assignedTo.user.toString() === req.user._id.toString());

    if (!canUpdateProgress) {
      return res.status(403).json({ message: 'Access denied' });
    }

    okr.keyResults = req.body.keyResults;
    await okr.save();

    const updatedOkr = await OKR.findById(okr._id)
      .populate('assignedTo.user', 'firstName lastName email')
      .populate('assignedTo.team', 'name')
      .populate('assignedBy', 'firstName lastName')
      .populate('organization', 'name')
      .populate('department', 'name')
      .populate('team', 'name')
      .populate('comments.user', 'firstName lastName');

    res.json(updatedOkr);
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/okrs/:id/comments
// @desc    Add comment to OKR
// @access  Private
router.post('/:id/comments', [
  auth,
  body('text').notEmpty().withMessage('Comment text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const okr = await OKR.findById(req.params.id);
    if (!okr) {
      return res.status(404).json({ message: 'OKR not found' });
    }

    okr.comments.push({
      user: req.user._id,
      text: req.body.text
    });

    await okr.save();

    const updatedOkr = await OKR.findById(okr._id)
      .populate('assignedTo.user', 'firstName lastName email')
      .populate('assignedTo.team', 'name')
      .populate('assignedBy', 'firstName lastName')
      .populate('organization', 'name')
      .populate('department', 'name')
      .populate('team', 'name')
      .populate('comments.user', 'firstName lastName');

    res.json(updatedOkr);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/okrs/:id
// @desc    Delete OKR
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const okr = await OKR.findById(req.params.id);
    if (!okr) {
      return res.status(404).json({ message: 'OKR not found' });
    }

    // Check if user has permission to delete
    const canDelete = req.user.role === 'admin' || 
                     okr.assignedBy.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({ message: 'Access denied' });
    }

    okr.isActive = false;
    await okr.save();

    res.json({ message: 'OKR deleted successfully' });
  } catch (error) {
    console.error('Delete OKR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 