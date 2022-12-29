const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const rfs = require('rotating-file-stream');
const logger = require('morgan');
const multer = require('multer');
const sessions = require('express-session');
require('dotenv').config();
// require auth.json
const auth = require('../../auth.json');
const { getDirTree, wipeDir, getSingleDir, compile } = require('../utils/worker');

let accessLogStream = rfs.createStream('access.log', {
    interval: '1d', // rotate daily
    size: '20M', // rotate when file size exceeds 20 MegaBytes
    compress: "gzip", // compress rotated files
    path: path.join(__dirname, '../..', 'logs')
})

// function for multer
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        let user = req.session.user.username;
        cb(null, path.join(process.cwd(), 'uploads', user));
    },
    filename: function(req, file, cb) {
        const extFilters = ['.cpp', '.c', '.h', '.hpp', '.ld', '.s'];
        let ext = path.extname(file.originalname);
        if (extFilters.indexOf(ext) == -1) {
            return cb(new Error('Invalid file extension'));
        } else {
            // get user
            let user = req.session.user.username;
            
            // create folder structure
            // search for last occurence of '/'
            let lastSlash = file.originalname.lastIndexOf('/');
            let folder = path.join(process.cwd(), 'uploads', user, file.originalname.substring(0, lastSlash));
            // console.log(folder)
            
            fsp.mkdir(folder, { recursive: true }).then(() => {
                cb(null, file.originalname);
            }).catch(err => {
                cb(err);
            });
        }
    }
});

async function authGuard(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        // check if post request
        if (req.method == 'POST') {
            return res.status(401).json({
                message: 'Unauthorized',
                success: false
            });
        }
        res.redirect('/');
    }
}

class App {
    io;
    server;
    constructor() {
        this.app = express();
        this.server = require('http').createServer(this.app);
        this.app.engine('e', require('ejs').renderFile);
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, '..', 'views'));
        this.app.use(cors());
        this.app.use(cookieParser());
        this.app.use(logger('[:date[iso]] :remote-addr ":referrer" ":user-agent" :method :url :status :res[content-length] - :response-time ms', { stream: accessLogStream }));
        this.app.use(logger(' >> :method :url :status :res[content-length] - :response-time ms'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({
            extended: true
        }));
        this.app.use(sessions({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: true,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
            }
        }));
        this.app.use('/public', express.static(path.join(__dirname, '..', 'public')));
    }

    async registerRoutes() {

        this.app.get('/', async function (req, res) {	
            res.render('index.ejs');
        });

        this.app.get('/panel', authGuard, async function (req, res) {
            res.render('panel.ejs');
        });

        this.app.get('/list', authGuard, async function (req, res) {
            let user = req.session.user.username;
            let tree = await getDirTree(path.join(process.cwd(), 'uploads', user));
            res.status(200).json({
                message: 'OK',
                success: true,
                tree: tree
            });
        });

        // login
        this.app.post('/login', async function (req, res) {
            // check user and password
            if (!req.body.username || !req.body.password) {
                return res.status(400).json({
                    message: 'Missing credentials',
                    success: false
                });
            }
            // search for user
            let user = auth.users.find(user => user.username == req.body.username);
            if (user) {
                // check password
                if (user.password == req.body.password) {
                    // login
                    req.session.user = user;
                    return res.status(200).json({
                        message: 'Login successful',
                        success: true
                    });
                }  
            }
            res.status(400).json({
                message: 'Invalid credentials',
                success: false
            });
        });

        // upload
        this.app.post('/upload', authGuard, async function (req, res) {
            req.setTimeout(1000 * 60); // 1 minute
            // auth check
            // clear old files
            let user = req.session.user.username;
            await wipeDir(path.join(process.cwd(), 'uploads', user));

            const upload = multer({
                preservePath: true,
                storage: storage,
                limits: {
                    fileSize: 1024 * 1024 // 1MB
                }
            }).array('files', 100); // 100 files max at a time
            await upload(req, res, async function(err) {
                if (err) {
                    // console.log(err)
                    return res.status(400).json({
                        message: err.message,
                        success: false
                    });
                }
            });

            setTimeout(async () => {
                let folder = await getSingleDir(path.join(process.cwd(), 'uploads', user));
                const target = "hhk";
                await compile(path.join(process.cwd(), 'uploads', user, folder), target);
                // serve the output file
                setTimeout(() => {
                    res.download(path.join(process.cwd(), 'uploads', user, folder, 'compiled.' + target));
                }, 2000);
            }, 2000);
        });

        this.app.use((req, res) => {
            res.render('404.ejs');
        });
    }

    async listen(fn) {
        this.server.listen(process.env.EXPRESS_PORT, fn)
    }
}

module.exports = App;