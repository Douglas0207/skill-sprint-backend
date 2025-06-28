const express = require('express');
const Team = require('../models/Team');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/teams
// @desc    Get all teams in user's organization
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const teams = await Team.find({ 
      organization: req.user.organization,
      isActive: true 
    })
    .populate('department', 'name')
    .populate('organization', 'name')
    .populate('teamLead', 'firstName lastName email')
    .sort({ name: 1 });

    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/teams/:id
// @desc    Get team by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('department', 'name')
      .populate('organization', 'name')
      .populate('teamLead', 'firstName lastName email');

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if user has access to this team
    if (team.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(team);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/teams
// @desc    Create team
// @access  Private (Admin/Team Lead)
router.post('/', auth, authorize('admin', 'team_lead'), async (req, res) => {
  try {
    const { name, description, department, teamLead } = req.body;

    const team = new Team({
      name,
      description,
      department,
      organization: req.user.organization,
      teamLead
    });

    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('department', 'name')
      .populate('organization', 'name')
      .populate('teamLead', 'firstName lastName email');

    res.status(201).json(populatedTeam);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 