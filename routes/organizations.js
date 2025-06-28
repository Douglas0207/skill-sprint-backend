const express = require('express');
const Organization = require('../models/Organization');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/organizations
// @desc    Get all organizations
// @access  Private (Admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const organizations = await Organization.find({ isActive: true })
      .sort({ name: 1 });

    res.json(organizations);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/organizations/:id
// @desc    Get organization by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/organizations
// @desc    Create organization
// @access  Private (Admin only)
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, description, domain } = req.body;

    const organization = new Organization({
      name,
      description,
      domain
    });

    await organization.save();

    res.status(201).json(organization);
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 