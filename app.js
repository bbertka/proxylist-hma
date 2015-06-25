var Hapi = require('hapi');
var Promise = require('bluebird');
var _ = require('lodash');
var request = require('request');

var server = new Hapi.Server();
server.connection({ port: process.env.PORT || 3000 });

var url = 'http://www.hidemyass.com/proxy-list/';

var proxyList, latestProxy;

server.route({
    method: 'GET',
    path: '/',
    handler: listProxies
});

server.route({
    method: 'GET',
    path: '/all/{protocol?}',
    handler: listProxies
});

server.route({
    method: 'GET',
    path: '/random/{protocol?}',
    handler: randomProxy
});

server.route({
    method: 'GET',
    path: '/latest/{protocol?}',
    handler: latestProxy
});

server.route({
    method: 'GET',
    path: '/refresh',
    handler: function(request, reply) {
        refreshProxies();
        reply('refreshing');
    }
});

function resetProxyList() {
    proxyList = {
        all: [],
        http: [],
        https: []
    };

    latestProxy = {
        any: {},
        http: {},
        https: {}
    };
}

function refreshProxies() {
    console.log('app.js: refreshProxies()');
    resetProxyList();

    for (var i = 1; i <= 5; i++) {
        getProxies(i);
    }
}

function addProxy(proxy) {
    proxyList.all.push(proxy);

    if (proxy.type === 'HTTP') {
        proxyList.http.push(proxy);
    }

    if (proxy.type === 'HTTPS') {
        proxyList.https.push(proxy);
    }
    
}

function addLatestProxy(proxy) {
    latestProxy.any =proxy;

    if (proxy.type === 'HTTP') {
        latestProxy.http = proxy;
    }

    if (proxy.type === 'HTTPS') {
        latestProxy.https = proxy;
    }
}
function listProxies (request, reply) {
    if (!proxyListExists()) {
        reply([]);
        return;
    }   

    var proxyies = []
    if (!request.params.protocol) {
        proxyies = getProxyList();
    } else if (request.params.protocol === 'http') {
        proxies = getHttpProxyList();
    } else if (request.params.protocol === 'https') {
        proxies = getHttpsProxyList();
    }

    reply(proxyies);
}


function randomProxy (request, reply) {
    if (!proxyListExists()) {
        reply({});
        return;
    }

    var proxy = {};
    if (!request.params.protocol) {
        proxy = getRandomProxy();
    } else if (request.params.protocol === 'http') {
        proxy = getRandomHttpProxy();
    } else if (request.params.protocol === 'https') {
        proxy = getRandomHttpsProxy();
    }

	reply(proxy);
}

function latestProxy (request, reply) {
    if (!proxyListExists()) {
        reply({});
        return;
    }

    var proxy = {};
	if (!request.params.protocol) {
		proxy = getLatestProxy();
	} else if (request.params.protocol === 'http') {
		proxy = getLatestHttpProxy();
	} else if (request.params.protocol === 'https') {	
		proxy = getLatestHttpsProxy();
	}

	reply(proxy);
}

function proxyListExists() {
	return proxyList.all.length != 0;
}

function getRandomProxy() {
	return _.sample(proxyList.all, 1);
}

function getRandomHttpProxy() {
    return _.sample(proxyList.http, 1);
}

function getRandomHttpsProxy() {
	return _.sample(proxyList.https, 1);
}

function getLatestProxy() {
	return latestProxy.any;
}

function getLatestHttpProxy() {
	return latestProxy.http;
}

function getLatestHttpsProxy() {
	return latestProxy.https;
}

function getProxyList() {
	return proxyList.all;
}

function getHttpProxyList() {
	return proxyList.http;
}

function getHttpsProxyList() {
	return proxyList.https;
}


function getProxies(page){
    fakeNums = {};
    request(url + page, function(err, res, body){
        if (err || !res || res.statusCode !== 200) {
            console.log("Response code was " + res.statusCode);
            return;
        }

        var ips = [];
        var ports = [];
        var types = [];

        body.replace(/\.(.*?)\{display\:none\}/g, function () {
            //arguments[0] is the entire match
            fakeNums[arguments[1]] = 1;
        });

        body.replace(/<td>(.*?)<\/td>/g, function () {
            if(arguments[1] === "HTTP" || arguments[1] === "HTTPS" || arguments[1] === "socks4/5") {
                types.push(arguments[1]);
            }
        });

        var trim = body;
        trim = trim.replace(/\s/g,'');

        trim.replace(/<td>([0-9]+)<\/td>/g, function () {
            ports.push(arguments[1]);
        });

        body.replace(/<\/style>(.*?)<\/td>/g, function () {
            var temp = arguments[1];
            temp = temp.replace(/<span class\=\"(.*?)\">.*?<\/span>/g,function(){
                if(fakeNums[arguments[1]]){
                    return '';
                }
                return arguments[0];
            })
            temp = temp.replace(/<span style\=\"display\:none\">(.*?)<\/span>/g,"");
            temp = temp.replace(/<div style\=\"display\:none\">(.*?)<\/div>/g,"");
            temp = temp.replace(/<(.*?)>/g,'');
            ips.push(temp);
        })

        var count = 0;
        var max = ips.length;

        if(max > 0){
            if(ports.length == 0 || ports.length != ips.length || ips.length != types.length) {
                console.log("Regex parsing has failed.");
                return;
            }
            
            var foundHttp = false;
            var foundHttps = false;
            for(var i = 0; i < max; i++){
                if(types[i] === 'HTTP' || types[i] === 'HTTPS'){
                    count++
                    var address, port, type;
                    if (page === 1) { //only look at the first page, has the latest
                        if (types[i] === 'HTTP' && foundHttp === false) { //look for the first HTTP proxy
                            foundHttp = true;
                            addLatestProxy({address:ips[i], port:ports[i], type:types[i]});
                        } else if (types[i] === 'HTTPS' && foundHttps === false) { //look for the first HTTPS proxy
                            foundHttps = true;
                            addLatestProxy({address:ips[i], port:ports[i], type:types[i]}); 
                        }
                    }
                    addProxy({address:ips[i], port:ports[i], type:types[i]}); //add the proxy to the main list
                }
            }
        }   
    });
}

refreshProxies();
setInterval(function() {
    refreshProxies();
}, 600000); //every 10min

server.start(function () {
    console.log('Server running at:', server.info.uri);
});