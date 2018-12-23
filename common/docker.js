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

const log = require('debug')('hostlab:docker');
const Docker = require('dockerode');
const {socketPath, protocol, host, port} = require('./connections').docker;
const docker = !host
    ? new Docker({socketPath})
    : new Docker({protocol, host, port});
const stream = require('stream');

const dockerfile = {
  node: file => `\
FROM node:carbon-alpine
WORKDIR /app
ADD ${file} .
RUN mv */* .
RUN npm install
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/npm", "run-script"]
CMD ["start"]`,
};
const usersNetwork = 'hostlab_users';

/**
 * Creates and starts a mongoDB instance for the user if not already owns one.
 *
 * @param {Object} req       The req object
 * @returns {Promise<Object>}
 */
function createAndStartUsersMongoInstance(req) {
  return new Promise(function(resolve, reject) {
    // Check if user already owns a mongoDB instance
    if (req.user.containers.mongo.id) {
      return resolve(req.user.containers.mongo.id);
    }
    // create container with latest alpine-mongo
    docker.createContainer({
          Image: 'mvertes/alpine-mongo:latest',
          Hostconfig: {
            NetworkMode: usersNetwork,
          },
        },
        function createdContainer(err, container) {
          if (err) {
            return reject(err);
          }
          // start the created container
          container.start(function startedContainer(err, data) {
            if (err) {
              return reject(err);
            }
            container.inspect((err, data) => {
              if (err) {
                return reject(err);
              }
              // save hostname of the container to the DB
              req.user.update({'containers.mongo.id': data.Config.Hostname},
                  function updatedUser(err, raw) {
                    if (err) {
                      return reject(err);
                    }
                    // resolve the promise with the new hostname
                    return resolve(data.Config.Hostname);
                  },
              );
            });
          });
        },
    );
  });
}

/**
 * Creates and starts a mongoExpress instance for the user if he does not already own one.
 *
 * @param {Object} req       The req object
 * @param {number} mongoID   The mongoDB ID of the user
 * @returns {Promise<Object>}
 */
function createAndStartUsersMongoExpressInstance(req, mongoID) {
  return new Promise(async function(resolve, reject) {
    if (req.user.containers.mongoExpress.id) {
      // resolve the promise with the ID of the users mongoExpress container
      return resolve(req.user.containers.mongoExpress.id);
    }
    // create new mongo-express container
    docker.createContainer({
          Image: 'mongo-express',
          Env: [
            'ME_CONFIG_MONGODB_ENABLE_ADMIN=true',
            `ME_CONFIG_MONGODB_SERVER=${mongoID}`,
            `ME_CONFIG_SITE_BASEURL=/${req.user.email.split(
                '@')[1]}/${req.user.email.split('@')[0]}/mongo/`,
          ],
          ExposedPorts: {
            '8081/tcp': {},
          },
          Hostconfig: {
            NetworkMode: usersNetwork,
          },
        },
        function createdContainer(err, container) {
          if (err) {
            return reject(err);
          }
          // start the created container
          container.start(function startedContainer(err, data) {
            if (err) {
              return reject(err);
            }
            container.inspect((err, data) => {
              if (err) {
                return reject(err);
              }
              // save the hostname of the container in the DB
              req.user.update(
                  {'containers.mongoExpress.id': data.Config.Hostname},
                  function updatedUser(err, raw) {
                    if (err) {
                      return reject(err);
                    }
                    const userObj = req.user.email.split('@');
                    // register the new mongoExpress container to the proxy
                    require('./connections').
                        proxy.
                        register(
                            `${req.app.get(
                                'host')}/${userObj[1]}/${userObj[0]}/mongo`,
                            `${data.NetworkSettings.Networks.hostlab_users.IPAddress}:8081/${userObj[1]}/${userObj[0]}/mongo/`);
                    // return the hostname of the new container
                    return resolve(data.Config.Hostname);
                  },
              );
            });
          });
        });
  });
}

/**
 * Returns the Application Status
 *
 * @param {string} applicationName name of the application
 * @returns {Promise<Object>}
 */
function getStatusOfApplication(applicationName) {
  return new Promise(function(resolve, reject) {
    const containerToInspect = docker.getContainer(applicationName);
    containerToInspect.inspect(function(err, data) {
      resolve(data && data.State.Status);
    });
  });
}

/**
 * Return the log of the given container
 *
 * @param {number} containerId ID of the wanted container
 * @returns {Promise<Object>}
 */
function retrieveContainerLogs(containerId) {
  return new Promise(function(resolve, reject) {
    let container = docker.getContainer(containerId);
    let logOpts = {
      stdout: 1,
      stderr: 1,
      tail: 100,
      follow: 0,
    };
    let containerLogs = [];
    const logStream = new stream.PassThrough();
    // retrieve container logs and push it to the containerLogs array
    logStream.on('data', function(chunk) {
      containerLogs.push(chunk.toString('utf8'));
    });
    container.logs(logOpts, function(err, stream) {
      if (err) {
        reject(err);
      }
      container.modem.demuxStream(stream, logStream, logStream);
      stream.on('end', function() {
        logStream.end();
        // resolve the promise and return containerLogs
        resolve(containerLogs);
      });
      setTimeout(function() {
        stream.destroy();
      }, 2000);
    });
  });
}

module.exports = {
  docker,
  dockerfile,
  createAndStartUsersMongoInstance,
  createAndStartUsersMongoExpressInstance,
  retrieveContainerLogs,
  getStatusOfApplication,
};
