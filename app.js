var Hapi = require('hapi');
var Promise = require('bluebird');
var redis = Promise.promisifyAll(require("redis"));

var server = new Hapi.Server();
server.connection({ port: process.env.PORT || 3000 });

if (process.env.VCAP_SERVICES) {
	var services = JSON.parse(process.env.VCAP_SERVICES);
	var credentials = services.rediscloud[0].credentials;
} else {
	credentials = {
		port: 6379,
		hostname: 'localhost',
		password: null
	}
}
var client = redis.createClient(
	credentials.port,
	credentials.hostname,
	{
		auth_pass: credentials.password
	}
);

client = Promise.promisifyAll(client);
client.on("error", function (err) {
    console.log("Redis Error " + err);
});

var url = 'http://www.hidemyass.com/proxy-list/';

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

function listProxies (request, reply) {
    var p = proxyListExists().then(function(exists) {
    	return exists;
    }).then(function(exists) {
    	if (exists) {
    		if (!request.params.protocol) {
    			return getProxyList();
    		} else if (request.params.protocol === 'http') {
    			return getHttpProxyList();
    		} else if (request.params.protocol === 'https') {
    			return getHttpsProxyList();
    		}
    	}
		return [];
    }).map(function(proxy) {
		return JSON.parse(proxy);
	}).then(function(proxyList) {
		reply(proxyList);
	});
}


function randomProxy (request, reply) {
    var p = proxyListExists().then(function(exists) {
    	return exists;
    }).then(function(exists) {
    	if (exists) {
    		if (!request.params.protocol) {
    			return getRandomProxy();
    		} else if (request.params.protocol === 'http') {
				return getRandomHttpProxy();
    		} else if (request.params.protocol === 'https') {
				return getRandomHttpsProxy();
    		}
			
    	} else {
    		p.cancel();
    		reply({});
    	}
    }).then(function(proxy) {
		reply(JSON.parse(proxy));
    });
}

function latestProxy (request, reply) {
    var p = proxyListExists().then(function(exists) {
    	return exists;
    }).then(function(exists) {
    	if (exists) {
			if (!request.params.protocol) {
				return getLatestProxy();
			} else if (request.params.protocol === 'http') {
				return getLatestHttpProxy();
			} else if (request.params.protocol === 'https') {	
				return getLatestHttpsProxy();
			}
    	} else {
    		p.cancel();
    		reply({});
    	}
    }).then(function(proxy) {
    	reply(JSON.parse(proxy));
	});
}

function proxyListExists() {
	return client.existsAsync('proxy-list');
}

function getRandomProxy() {
	return client.srandmemberAsync('proxy-list');
}

function getRandomHttpProxy() {
	return client.srandmemberAsync('proxy-list-http');
}

function getRandomHttpsProxy() {
	return client.srandmemberAsync('proxy-list-https');
}

function getLatestProxy() {
	return client.getAsync('proxy-latest');
}

function getLatestHttpProxy() {
	return client.getAsync('proxy-latest-http');
}

function getLatestHttpsProxy() {
	return client.getAsync('proxy-latest-https');
}

function getProxyList() {
	return client.smembersAsync('proxy-list');
}

function getHttpProxyList() {
	return client.smembersAsync('proxy-list-http');
}

function getHttpsProxyList() {
	return client.smembersAsync('proxy-list-https');
}

server.start(function () {
    console.log('Server running at:', server.info.uri);
});