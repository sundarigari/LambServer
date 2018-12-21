const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const { execSync } = require('child_process');
const fs = require('fs');

const app = express()
const docker_image = 'sundarigari/nodeworker'; //  node:11-alpine with pg for worker image
var indexfile = "./worker/index.js";
var userid = 'sund';
var fname = 'myfunc';

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

var redis = require('redis');
var redis_port = 6379;
var redis_dns = '192.168.99.100';
var worker_dns = redis_dns;
var worker_int_port = 81;

var redis_client = redis.createClient(redis_port, redis_dns);
redis_client.on('error', function (err) {
    console.log('Something went wrong with redis ', err)
});
redis_client.set('mykey', JSON.stringify({ v: 'redis', j: 'working' }));

redis_client.get('mykey', function (error, result) {
    if (error) throw error;
    console.log('mykey', JSON.parse(result));
});


app.get('/', function (req, res) { res.render('index', { worker_log: null, worker_output: null, error: null }); })

app.post('/', function (req, res) {

    var worker_ext_port = (Math.floor(Math.random() * (10000)) + 30000).toString();
    var docker_name;
    var uenv;

    redis_client.get(userid + fname, function (error, result) {
        if (error || !result) {
            docker_name = userid + fname + worker_ext_port;
            redis_client.set(userid + fname, JSON.stringify({ docker_name: docker_name, docker_ext_port: worker_ext_port }), redis.print);
        }
        else {
            uenv = JSON.parse(result);
            docker_name = uenv.docker_name;
            worker_ext_port = uenv.docker_ext_port;
        }

        var local_worker_logfile = '/home/workerlogs/' + docker_name + '.log';
        var docker_build_cmd = 'docker build -t ' + docker_image + ' ./worker';
        var docker_run_cmd = 'docker run -d --name ' + docker_name + ' -t -p 0.0.0.0:' + worker_ext_port + ':' + worker_int_port.toString() + '/tcp  ' + docker_image;
        var docker_copy_cmd = 'docker cp ' + docker_name + ':/worker.log  ' + local_worker_logfile;
        var docker_stop_cmd = 'docker stop ' + docker_name;
        var docker_rm_cmd = 'docker rm ' + docker_name;
        let url = 'http://' + worker_dns + ':' + worker_ext_port + '/';

        var origindexfilecont = fs.readFileSync(indexfile, 'utf8');
        if (origindexfilecont != req.body.code) {
            fs.writeFileSync(indexfile, req.body.code);
            console.log(indexfile + " saved.");
        }

        //fs.writeFile(indexfile, req.body.code, function (err) {

        //if (err) return console.log(err);
        var docker_running = false;
        try {
            //execSync('docker-machine.exe env | Invoke-Expression');  // todo
            var outp = execSync("docker inspect -f '{{.State.Running}}' " + docker_name);
            docker_running = true;
        }
        catch {
            console.log("not running");
            console.log(docker_build_cmd);
            execSync(docker_build_cmd);
            execSync(docker_run_cmd);
            docker_running = true;
        }

        var func_changed = origindexfilecont != req.body.code;


        if (func_changed) {
            console.log(docker_build_cmd);
            execSync(docker_build_cmd);//, (err, stdout, stderr) => {  // build image from files in ./docker folder
        }

        //if (`${stdout}` != "") console.log(`${stdout}`); if (`${stderr}` != "") console.log(`${stderr}`);
        console.log(docker_run_cmd);
        if (func_changed) {
            if (docker_running) {
                console.log(docker_stop_cmd);
                execSync(docker_stop_cmd);//, (err, stdout, stderr) => {
                //if (err) console.log(`error executing command`);
                //if (`${stdout}` != "") console.log(`${stdout}`); if (`${stderr}` != "") console.log(`${stderr}`);
                console.log(docker_rm_cmd);
                execSync(docker_rm_cmd);//, (err, stdout, stderr) => {
                redis_client.set(userid + fname, "", redis.print);
            }
            execSync(docker_run_cmd);//, (err, stdout, stderr) => {
        }
        //exec(docker_run_cmd, (err, stdout, stderr) => {

        //if (`${stdout}` != "") console.log(`${stdout}`); if (`${stderr}` != "") console.log(`${stderr}`);
        const request = require('request');
        request.post({ url: url, body: req.body.event }, function (err, response, body) {

            console.log(body);
            console.log(docker_copy_cmd);
            exec(docker_copy_cmd, (err, stdout, stderr) => {

                if (`${stdout}` != "") console.log(`${stdout}`); if (`${stderr}` != "") console.log(`${stderr}`);
                const fs = require('fs');
                fs.readFile(local_worker_logfile, "utf8", function (err, data) {

                    console.log(data);
                    if (err) res.render('index', { worker_output: url + err, worker_log: url + err, error: url + ' Error calling POST on worker' });
                    else res.render('index', { worker_output: body, worker_log: data, error: null });

                    if (func_changed && docker_running) {
                        console.log(docker_stop_cmd);
                        execSync(docker_stop_cmd);//, (err, stdout, stderr) => {
                        //if (err) console.log(`error executing command`);
                        //if (`${stdout}` != "") console.log(`${stdout}`); if (`${stderr}` != "") console.log(`${stderr}`);
                        console.log(docker_rm_cmd);
                        execSync(docker_rm_cmd);//, (err, stdout, stderr) => {
                        redis_client.set(userid + fname, "", redis.print);
                        //if (err) console.log(`error executing command`);
                        //if (`${stdout}` != "") console.log(`${stdout}`); if (`${stderr}` != "") console.log(`${stderr}`);
                        //});
                        //});
                    }

                });
            });

            if (func_changed && docker_running) {
                execSync(docker_stop_cmd);//, (err, stdout, stderr) => {
                //if (err) console.log(`error executing command`);
                //if (`${stdout}` != "") console.log(`${stdout}`); if (`${stderr}` != "") console.log(`${stderr}`);
                console.log(docker_rm_cmd);
                execSync(docker_rm_cmd);//, (err, stdout, stderr) => {

                //if (err) console.log(`error executing command`);
                //if (`${stdout}` != "") console.log(`${stdout}`); if (`${stderr}` != "") console.log(`${stderr}`);
                //});
                //});
            }

        });
        //});
        //});
        //});
    })
});

app.listen(80, function () { console.log('Chalaki serverless listening on port 80 go to http://localhost:80') })