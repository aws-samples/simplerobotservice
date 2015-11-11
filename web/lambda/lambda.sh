#!/bin/bash

LAMBDA_FCT_FOLDERS=('srsputdata' 'srsgetdata')
LAMBDA_FCT_NAMES=('srsputdata' 'srsgetdata')
mkdir temp
for i in "${!LAMBDA_FCT_FOLDERS[@]}"; do
    read -p "Do you want to deploy lambda function: ${LAMBDA_FCT_NAMES[$i]}? " -n 1 -r
    echo    # (optional) move to a new line
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
      cd ${LAMBDA_FCT_FOLDERS[$i]}
      npm install
      zip -r ../temp/${LAMBDA_FCT_FOLDERS[$i]}.zip index.js node_modules
      aws lambda update-function-code \
        --function-name "${LAMBDA_FCT_NAMES[$i]}" \
        --zip-file "fileb://../temp/${LAMBDA_FCT_FOLDERS[$i]}.zip" \
        --profile $1 \
        --region $2
    fi
      echo "Skipping this function..."
done
rm -r -f ../temp/
