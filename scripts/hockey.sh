#!/bin/sh

pushd platforms/ios/

ls -la

xcodebuild -scheme "Bazaarr" -configuration Release clean archive

popd