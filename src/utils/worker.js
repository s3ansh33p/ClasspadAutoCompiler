const { exec } = require('child_process');
const fs = require('fs');

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



module.exports = {
    runCommand
}
