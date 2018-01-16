const router = require('express').Router();
const { promisify } = require('util');
const tmp = require('tmp-promise');
const snek = require('snekfetch');
const write = promisify(require('fs').writeFile);
const {docker, dockerfile} = require('../../common/docker');
const proxy = require('../../common/connections').proxy;
const log = require('debug')('hostlab:route:api:container');
const gitlab_token = process.env.GITLAB_TOKEN;
const gitlab_url = process.env.GITLAB_URL;
const hostlab_ip = process.env.VM_HOSTLAB_IP;
const proxy_port = process.env.PROXY_PORT;

const User = require('../../models/user');


router.post('/:repositoryID', async (req, res, next) => {
    try {
        const {repositoryID} = req.params;
        log('Creating Container with Repository ID:', repositoryID);
        const archive = 'archive.tar.gz';
        const { path } = await tmp.dir({
            template: '/tmp/tmp-XXXXXX',
            unsafeCleanup: true,
        });
        const response = await snek.get(`${gitlab_url}/api/v4/projects/${repositoryID}/repository/archive?private_token=${gitlab_token}`);
        await write(`${path}/${archive}`, response.body);
        log('File Saved.');
        await write(`${path}/Dockerfile`, dockerfile.node(archive), 'utf-8');
        // Kein Fehler beim Schreiben
        const out = await docker.buildImage({
            context: path,
            src: ['Dockerfile', archive],
        }, {t: 'nodeimage'});
        out.pipe(process.stdout, {
            end: true,
        });
        out.on('end', async () => {
            let freePort=5000;

            const resUsers = await snek.get(`http://localhost:${req.app.settings.port}/api/v1/users`).
                set('cookie', req.headers.cookie);
            users = resUsers.body;
            let usedPortFound = false;

            do {
                usedPortFound = false;
                for (var i in users) {
                    for (var j in users[i].containers) {
                        if (users[i].containers[j].port == freePort.toString()) {
                            freePort++;
                            usedPortFound = true;
                        }
                    }
                }
            } while (usedPortFound);

            const container = await docker.createContainer({
                Image: 'nodeimage',
                ExposedPorts: {
                    [(process.env.CONTAINER_USER_PORT || '8080') + '/tcp']: {},
                },
                Hostconfig: {
                    Privileged: true,
                    PortBindings: {
                        [(process.env.CONTAINER_USER_PORT || '8080') + '/tcp']: [
                            {
                                HostPort: freePort.toString(),
                                HostIP: hostlab_ip,
                            }],
                    },
                },
            });
            container.start(async () => {
                const response = await snek.get(`${gitlab_url}/api/v4/projects/${repositoryID}?private_token=${gitlab_token}`);
                const appName = req.body.name;
                const projID = JSON.parse(response.text).id;

                User.findByIdAndUpdate(req.user._id, {$push: {containers: {name: `${appName}`, port: freePort, scriptLoc: '/a/path/'}}}, (err, user) => {
                    if (err) {		
                        return next(err);		
                    }
                    const userObj = user.email.split('@');
                    proxy.register(`${hostlab_ip}:${proxy_port}/${userObj[1]}/${userObj[0]}/${appName}`, `${hostlab_ip}:${freePort}`);
                    res.send(200);
                });
            });
        });
    } catch (err) {
        console.error;
    }
});

router.delete('/:repositoryID', (req, res, next) => {
    const {repositoryID} = req.params;
    log('Deleting Container with Repository ID:', repositoryID);
    res.send(repositoryID);
});

module.exports = router;