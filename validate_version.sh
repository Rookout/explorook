#!/bin/bash

# Get current version from package.json file
CURRENT_VERSION="$(node -e 'console.log(require("./package").version)')"
# Add "v" prefix
CV_WITH_V="v$CURRENT_VERSION"

# Get all tags exists
TAGS="$(git tag -l)"


# check if current version already has a tag which means the publish will fail
[[ $TAGS =~ (^|[[:space:]])$CV_WITH_V($|[[:space:]]) ]] && echo "a release tag with version $CV_WITH_V already exists" && exit 1
echo 'no version conflicts found'