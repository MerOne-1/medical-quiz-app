#!/bin/bash

# Check git status
git status

# Show current branch
current_branch=$(git branch --show-current)
echo -e "
Currently on branch: $current_branch"
