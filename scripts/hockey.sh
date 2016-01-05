#!/bin/sh

pushd platforms/ios/

xcodebuild -scheme "$XCODE_SCHEME" -project "$XCODE_PROJECT" clean archive CODE_SIGN_IDENTITY="$DEVELOPER_NAME"

popd