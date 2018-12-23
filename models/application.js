/*
 * This file is part of The HostLab Software.
 *
 * Copyright 2018
 *     Adrian Beckmann, Denis Paris, Dominic Claßen,
 *     Jan Wystub, Manuel Eder, René Heinen, René Neißer.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const mongoose = require('mongoose');
const slugify = require('slugify');

const { getStatusOfApplication } = require('../common/docker');

// Fixes deprecation warning
mongoose.Promise = Promise;

const applicationSchema = mongoose.Schema({
  name: String,
  created: {
    type: Date,
    default: Date.now,
  },
  repoName: String,
  repoID: Number,
  repoBranch: String,
  autostart: Boolean,
  commitHash: String,
  needsMongo: String,
});

applicationSchema.post('init', async function() {
  this.isRunning = await getStatusOfApplication(this._id) === 'running';
});

applicationSchema.virtual('mountPath').get(function() {
  const userObj = this.parent().email.split('@');
  return `/${userObj[1]}/${userObj[0]}/${slugify(this.name)}/`;
});

module.exports = applicationSchema;
