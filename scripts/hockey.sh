#!/bin/sh

pushd platforms/ios/

xcodebuild clean -project "$XCODE_PROJECT" -configuration Release -alltargets

popd