#!/bin/bash

# ReplateAI Milestone Creation Script
# Updated to match Sprint Timeline dates

echo "Creating ReplateAI Sprint Milestones..."
echo ""

# Sprint 01: Feb 2 - Feb 13, 2026 (12 days)
echo "Creating Sprint 01..."
gh api repos/CSYE7230-Group03/SDLC-TeamProject/milestones \
  -X POST \
  -f title="Sprint 01" \
  -f due_on="2026-02-13T23:59:59Z" \
  -f description="Platform Setup & Technical Foundations (12 days) - Complete technical foundation and enable development"

# Sprint 02: Feb 14 - Feb 28, 2026 (14 days)
echo "Creating Sprint 02..."
gh api repos/CSYE7230-Group03/SDLC-TeamProject/milestones \
  -X POST \
  -f title="Sprint 02" \
  -f due_on="2026-02-28T23:59:59Z" \
  -f description="Core Recipe & Ingredient Features Part 1 (14 days) - Enable basic ingredient capture and recipe generation"

# Sprint 03: Mar 1 - Mar 15, 2026 (14 days)
echo "Creating Sprint 03..."
gh api repos/CSYE7230-Group03/SDLC-TeamProject/milestones \
  -X POST \
  -f title="Sprint 03" \
  -f due_on="2026-03-15T23:59:59Z" \
  -f description="Core Recipe & Ingredient Features Part 2 (14 days) - Complete recipe and inventory management features"

# Sprint 04: Mar 16 - Mar 30, 2026 (14 days)
echo "Creating Sprint 04..."
gh api repos/CSYE7230-Group03/SDLC-TeamProject/milestones \
  -X POST \
  -f title="Sprint 04" \
  -f due_on="2026-03-30T23:59:59Z" \
  -f description="Grocery Integration & User Management (14 days) - Enable grocery ordering and basic user authentication"

# Sprint 05: Mar 31, 2026 (1 day - Final deadline)
echo "Creating Sprint 05..."
gh api repos/CSYE7230-Group03/SDLC-TeamProject/milestones \
  -X POST \
  -f title="Sprint 05" \
  -f due_on="2026-03-31T23:59:59Z" \
  -f description="Final Polish & Deployment (1 day) - Complete user management features and finalize MVP"

echo ""
echo "All milestones created successfully!"
echo ""
echo "Sprint Duration Summary:"
echo "  Sprint 01: 12 days (Feb 2 - Feb 13)"
echo "  Sprint 02: 14 days (Feb 14 - Feb 28)"
echo "  Sprint 03: 14 days (Mar 1 - Mar 15)"
echo "  Sprint 04: 14 days (Mar 16 - Mar 30)"
echo "  Sprint 05: 1 day   (Mar 31)"
echo ""
echo "To view milestones, run: gh api repos/CSYE7230-Group03/SDLC-TeamProject/milestones"
