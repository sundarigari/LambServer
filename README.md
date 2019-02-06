# LambServer - provides AWS Lambda like FaaS functionality for javascript and GO on kubernetes

## node.js
### web interface (node express)
main code:  
    /lambda_server.js  
ejs views:  
    /views/index.ejs
### lambda example function in javascript 
/index.js  
all lambda must have one and only one exports.handler = async (event) => {  // function body }
### template files
/worker/node/template  
### generated code
/worker/node/userid/function-name  
    deploy_worker2.yml  
    service_worker2.yml  
    worker.js   
### testing the lambda function written in node.js
/AjaxText


## golang
### Go program 
/src/lambserver/main.go
### template files:  
/worker/go/template  
### generated code
/worker/go/userid/function-name  
   deploy_worker2.yml  
   service_worker2.yml  
   worker.sh  
### web interface
chi 
routes.json
