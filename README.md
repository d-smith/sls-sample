Simple project to explore adding models and gateway model enforcement to a serverless application.

Note: looks like there's no way to exclude support for x-www-form-urlencoded in terms of the gateway body mapping templates: serverless framework creates a default request template for this content type.

This means requests defaulting to application/x-www-form-urlencoded reach the lambda:

<pre>
$ curl -v https://i2fgtv9sce.execute-api.us-east-1.amazonaws.com/dev/foo -d '{}' 
*   Trying nn.nn.nn.nn...
* TCP_NODELAY set
* Connected to xxxx
* allocate connect buffer!
* Establish HTTP proxy tunnel to i2fgtv9sce.execute-api.us-east-1.amazonaws.com:443
> CONNECT i2fgtv9sce.execute-api.us-east-1.amazonaws.com:443 HTTP/1.1
> Host: i2fgtv9sce.execute-api.us-east-1.amazonaws.com:443
> User-Agent: curl/7.58.0
> Proxy-Connection: Keep-Alive
> 
< HTTP/1.1 200 Connection established
< 
... proxy and tls stuff...
> POST /dev/foo HTTP/1.1
> Host: i2fgtv9sce.execute-api.us-east-1.amazonaws.com
> User-Agent: curl/7.58.0
> Accept: */*
> Content-Length: 2
> Content-Type: application/x-www-form-urlencoded
> 
* upload completely sent off: 2 out of 2 bytes
< HTTP/1.1 200 OK
< Content-Type: application/json
< Content-Length: 46
< Connection: keep-alive
< Date: Sun, 27 May 2018 15:12:38 GMT
< x-amzn-RequestId: 64e84a0d-61c0-11e8-8007-3bd898ea2851
< x-amz-apigw-id: HjSkFGZIoAMFozA=
< X-Amzn-Trace-Id: Root=1-5b0acae6-914fd1de73eded1b1e6554e5
< X-Cache: Miss from cloudfront
< Via: 1.1 232a435b4a9ffdf5c530ec162312c1dd.cloudfront.net (CloudFront)
< X-Amz-Cf-Id: qjqHHy5ipEy97XQPrWQ4qOBEcDvSJphvV_KkFtRuWPnIf8J-GCkcDg==
< 
* Connection #0 to host http.proxy.fmr.com left intact
{"statusCode":200,"body":{"message":"Did it"}}
</pre>

With application/json:

<pre>
$ curl https://i2fgtv9sce.execute-api.us-east-1.amazonaws.com/dev/foo -d '{}' -H 'content-type: application/json'
{"message": "Invalid request body"}
<pre>

You can see the request template created by the framework using the aws cli:

<pre>
# Get the rest api id via the cli or from the api url
$ aws apigateway get-rest-apis

# Get the resources...
$ aws apigateway get-resources --rest-api-id xxxxxxxxxx

# Get the integration for the resource
$ aws apigateway get-integration --rest-api-id xxxxxxxxxx --resource-id 259cks --http-method POST
{
    "type": "AWS",
    "httpMethod": "POST",
    "uri": "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:nnnnnnnnnnnn:function:sample-service-dev-doit/invocations",
    "requestParameters": {},
    "requestTemplates": {
        "application/json": "$input.json('$')",
        "application/x-www-form-urlencoded": "\n    #define( $body )\n      {\n      #foreach( $token in $input.path('$').split('&') )\n        #set( $keyVal = $token.split('=') )\n        #set( $keyValSize = $keyVal.size() )\n        #if( $keyValSize >= 1 )\n          #set( $key = $util.escapeJavaScript($util.urlDecode($keyVal[0])) )\n          #if( $keyValSize >= 2 )\n            #set($val = $util.escapeJavaScript($util.urlDecode($keyVal[1])).replaceAll(\"\\\\'\",\"'\"))\n          #else\n            #set( $val = '' )\n          #end\n          \"$key\": \"$val\"#if($foreach.hasNext),#end\n        #end\n      #end\n      }\n    #end\n\n    \n  #define( $loop )\n    {\n    #foreach($key in $map.keySet())\n        #set( $k = $util.escapeJavaScript($key) )\n        #set( $v = $util.escapeJavaScript($map.get($key)).replaceAll(\"\\\\'\", \"'\") )\n        \"$k\":\n          \"$v\"\n          #if( $foreach.hasNext ) , #end\n    #end\n    }\n  #end\n\n  {\n    \"body\": $body,\n    \"method\": \"$context.httpMethod\",\n    \"principalId\": \"$context.authorizer.principalId\",\n    \"stage\": \"$context.stage\",\n\n    \"cognitoPoolClaims\" : {\n       \n       \"sub\": \"$context.authorizer.claims.sub\"\n    },\n\n    #set( $map = $input.params().header )\n    \"headers\": $loop,\n\n    #set( $map = $input.params().querystring )\n    \"query\": $loop,\n\n    #set( $map = $input.params().path )\n    \"path\": $loop,\n\n    #set( $map = $context.identity )\n    \"identity\": $loop,\n\n    #set( $map = $stageVariables )\n    \"stageVariables\": $loop\n  }\n\n  "
    },
    "passthroughBehavior": "NEVER",
    "timeoutInMillis": 29000,
    "cacheNamespace": "259cks",
    "cacheKeyParameters": [],
    "integrationResponses": {
        etc...

</pre>


You can remove the request template for application/x-www-form-urlencoded via the following command:

<pre>
aws apigateway update-integration --rest-api-id xxxxxxxxxx --resource-id 259cks --http-method POST --patch-operations op='remove',path='/requestTemplates/application~1x-www-form-urlencoded'
</pre>

Hmmm... still passes through application/x-www-form-urlencoded - what's going on?

