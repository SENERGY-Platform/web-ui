#!/bin/sh

# Copyright 2021 InfAI (CC SES)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

envsubst < $1/assets/env.template.js > $1/assets/env.js # build env.js
envsubst < $1/assets/env.template.json > $1/assets/env.json # build env.json

THEME="${THEME:-senergy}"
cp $2/src/img/${THEME}/android-icon-72x72.png $1/assets/icons/icon-72x72.png
cp $2/src/img/${THEME}/android-icon-96x96.png $1/assets/icons/icon-96x96.png
cp $2/src/img/${THEME}/android-icon-128x128.png $1/assets/icons/icon-128x128.png
cp $2/src/img/${THEME}/android-icon-144x144.png $1/assets/icons/icon-144x144.png
cp $2/src/img/${THEME}/android-icon-152x152.png $1/assets/icons/icon-152x152.png
cp $2/src/img/${THEME}/android-icon-192x192.png $1/assets/icons/icon-192x192.png
cp $2/src/img/${THEME}/android-icon-384x384.png $1/assets/icons/icon-384x384.png
cp $2/src/img/${THEME}/android-icon-512x512.png $1/assets/icons/icon-512x512.png
