#!/bin/bash

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
# INSERT REMOTE
if [ ! -v ${ENV_URL} ]; then
  curl -s -o /tmp/env.remote.js $ENV_URL
  sed -i -e '/\/\/ REMOTE/r /tmp/env.remote.js' $1/assets/env.js #insert content from remote env.js
fi
