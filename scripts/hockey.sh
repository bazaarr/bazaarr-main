#!/bin/sh

pushd platforms/ios/

xcodebuild -scheme "Bazaarr" -configuration Release clean archive

popd