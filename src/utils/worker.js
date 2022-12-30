const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// run the command
async function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                console.log(err)
                reject(err);
            } else {
                console.log(`Executing command: ${command}`);
                console.log(stdout)
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
async function compile(fullpath) {
    let command = `cd ${fullpath} && make all APP_NAME="compiled" SDK_DIR="/home/sean/hollyhock-2/sdk"`;
    // copy the makefile and linker files
    await fs.promises.copyFile(path.join(process.cwd(), 'Makefile'), path.join(fullpath, 'Makefile'));
    await fs.promises.copyFile(path.join(process.cwd(), 'linker_hhk.ld'), path.join(fullpath, 'linker_hhk.ld'));
    await fs.promises.copyFile(path.join(process.cwd(), 'linker_bin.ld'), path.join(fullpath, 'linker_bin.ld'));
    // run the command
    let res = await runCommand(command);
    // console.log(command);
    return res;
}

// export functions
module.exports = {
    runCommand,
    getDirTree,
    getSingleDir,
    wipeDir,
    compile
}
