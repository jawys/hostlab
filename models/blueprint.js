const mongoose = require('mongoose');
const getPackageJSON = require('../modules/getpackagejson');
const getGitlabRepository = require('../modules/getGitlabRepository');
// Fixes deprecation warning
mongoose.Promise = Promise;

const blueprintSchema = new mongoose.Schema({
    name: String,
    containingRepoName: String,
    containingRepoID: Number,
    containingRepoBranch: String,
});

blueprintSchema.post('init', async function() {
    const packageJson = await getPackageJSON(this.containingRepoID, this.containingRepoBranch);

    if(typeof packageJson.scripts === 'object' && Object.keys(packageJson.scripts).length > 0) {
        this.scripts = Object.keys(packageJson.scripts);
    } else {
        this.scripts = [];
    }
});

module.exports = blueprintSchema;
