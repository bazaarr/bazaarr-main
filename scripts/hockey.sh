#!/bin/sh

pushd platforms/ios/

ipa build -c Distribution

popd