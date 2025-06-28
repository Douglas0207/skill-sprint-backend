const express = require('express');
const Department = require('../models/Department');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/departments
// @desc    Get all departments in user's organization
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const departments = await Department.find({ 
      organization: req.user.organization,
      isActive: true 
    })
    .populate('organization', 'name')
    .sort({ name: 1 });

    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('organization', 'name');

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if user has access to this department
    if (department.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(department);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/departments
// @desc    Create department
// @access  Private (Admin/Team Lead)
router.post('/', auth, authorize('admin', 'team_lead'), async (req, res) => {
  try {
    const { name, description } = req.body;

    const department = new Department({
      name,
      description,
      organization: req.user.organization
    });

    await department.save();

    const populatedDepartment = await Department.findById(department._id)
      .populate('organization', 'name');

    res.status(201).json(populatedDepartment);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 