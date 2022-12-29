const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// run the command
async function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve(stdout);
            }
        });
    });
}

// get directory tree
async function getDirTree(fpath) {
    // recursive function
    async function getTree(fpath) {
        let tree = [];
        let files = await fs.promises.readdir(fpath);
        for (let file of files) {
            let stat = await fs.promises.stat(fpath + '/' + file);
            if (stat.isDirectory()) {
                tree.push({
                    name: file,
                    type: 'directory',
                    children: await getTree(fpath + '/' + file)
                });
            } else {
                tree.push({
                    name: file,
                    type: 'file'
                });
            }
        }
        return tree;
    }
    return await getTree(fpath);
}

async function getSingleDir(fpath) {
    console.log(fpath)
    // should only be one directory in the path, if not, choose the first one
    let files = await fs.promises.readdir(fpath);
    for (let file of files) {
        let stat = await fs.promises.stat(fpath + '/' + file)
        if (stat.isDirectory()) {
            return file;
        }
    }
    return null;
}

// wipe directory
async function wipeDir(fpath) {
    // make sure the directory exists
    if (!fs.existsSync(fpath)) {
        fs.mkdirSync(fpath);
    }
    return new Promise((resolve, reject) => {
        // delete all files in the directory, then remake the directory
        fs.rm(fpath, { recursive: true, force: true }, (err) => {
            if (err) {
                reject(err);
            } else {
                fs.mkdir(fpath, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        });
    });
}

// compile
async function compile(fullpath, target) {
    let command = `make ${target} APP_NAME="compiled.${target}"`;
    // copy the makefile
    await fs.promises.copyFile(path.join(process.cwd(), 'Makefile'), path.join(fullpath, 'Makefile'));
    // run the command
    let res = await runCommand(command);
    // console.log(command);
    return true;
}

// export functions
module.exports = {
    runCommand,
    getDirTree,
    getSingleDir,
    wipeDir,
    compile
}
