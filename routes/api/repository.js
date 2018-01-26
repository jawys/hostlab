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

const router = require('express').Router();
const getPackageJSON = require('../../modules/getpackagejson');

router.get('/:id/:branch/scripts', async (req, res) => {
  const packageJson = await getPackageJSON(req.params.id, req.params.branch);

  if (typeof packageJson.scripts === 'object' &&
      Object.keys(packageJson.scripts).length > 0) {
    res.status(200).json(Object.keys(packageJson.scripts));
  } else {
    res.status(200).json([]);
  }
});

module.exports = router;