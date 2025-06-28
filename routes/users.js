const express = require('express');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users in organization
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ 
      organization: req.user.organization,
      isActive: true 
    })
    .select('-password')
    .populate('team', 'name')
    .populate('department', 'name')
    .populate('organization', 'name')
    .sort({ firstName: 1, lastName: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('team', 'name')
      .populate('department', 'name')
      .populate('organization', 'name');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is in same organization
    if (user.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user can update this profile
    const canUpdate = req.user.role === 'admin' || 
                     req.user._id.toString() === req.params.id;

    if (!canUpdate) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { firstName, lastName, team, department } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (team) user.team = team;
    if (department) user.department = department;

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('team', 'name')
      .populate('department', 'name')
      .populate('organization', 'name');

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 