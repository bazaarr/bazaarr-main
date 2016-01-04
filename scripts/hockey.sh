#!/bin/sh

pushd platforms/ios/

ipa build -c Distribution
ipa distribute:hockeyapp -m "circleci build" --token $HOCKEYAPP_TOKEN

popd