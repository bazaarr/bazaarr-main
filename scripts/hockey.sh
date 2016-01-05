#!/bin/sh

pushd platforms/ios/

xcodebuild clean -project "$XCODE_PROJECT" -configuration Release -alltargets

xcodebuild archive -project "$XCODE_PROJECT" -scheme "$XCODE_SCHEME" -archivePath "$APPNAME"

popd