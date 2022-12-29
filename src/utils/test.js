const path = require('path');
const { getSingleDir, wipeDir } = require('./worker');

async function test() {
    const fp = path.join(process.cwd(), '../..', 'uploads', 'dev')
    // let res = await getSingleDir('fp)
    // console.log(res)
    wipeDir(fp);

}
test();