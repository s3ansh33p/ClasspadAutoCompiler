const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const rfs = require('rotating-file-stream');
const logger = require('morgan');
const multer = require('multer');
require('dotenv').config();

let accessLogStream = rfs.createStream('access.log', {
    interval: '1d', // rotate daily
    size: '20M', // rotate when file size exceeds 20 MegaBytes
    compress: "gzip", // compress rotated files
    path: path.join(__dirname, '../..', 'logs')
})

// function for multer
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(process.cwd(), 'uploads'));
    },
    filename: function(req, file, cb) {
        const extFilters = ['.cpp', '.c', '.h', '.hpp', '.ld', '.s'];
        let ext = path.extname(file.originalname);
        if (extFilters.indexOf(ext) == -1) {
            return cb(new Error('Invalid file extension'));
        } else {
            // create folder structure
            // search for last occurence of '/'
            let lastSlash = file.originalname.lastIndexOf('/');
            let folder = path.join(process.cwd(), 'uploads', file.originalname.substring(0, lastSlash));
            console.log(folder)
            fsp.mkdir(folder, { recursive: true }).then(() => {
                cb(null, file.originalname);
            }).catch(err => {
                cb(err);
            });
        }
    }
});

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
        this.app.use('/public', express.static(path.join(__dirname, '..', 'public')));
    }

    async registerRoutes() {
        this.app.get('/', async function (req, res) {
            res.render('welcome.ejs');

        });

        // upload
        this.app.post('/upload', async function (req, res) {
            const upload = multer({
                preservePath: true,
                storage: storage,
                limits: {
                    fileSize: 1024 * 1024 // 1MB
                }
            }).array('files', 100); // 100 files max at a time
            upload(req, res, function(err) {
                if (err) {
                    console.log(err)
                    return res.status(400).json({
                        message: err.message,
                        success: false
                    });
                } else {
                    return res.status(200).json({
                        message: 'File uploaded successfully',
                        success: true
                    });
                }
            })
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